import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { NotificationsListQueryData } from '@harmonyhub/contracts';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Recordatorio de evento: se avisa cuando falta menos que esto y la persona todavia no confirmo. */
export const EVENT_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

export type NotificationInput = {
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  dedupeKey: string;
};

const notificationSelect = { id: true, organizationId: true, type: true, title: true, body: true, link: true, readAt: true, createdAt: true } satisfies Prisma.NotificationSelect;

/** Quien hizo el cambio no recibe aviso de su propia accion. */
export function withoutActor<T extends { userId: string }>(entries: T[], actorUserId?: string) {
  return actorUserId ? entries.filter((entry) => entry.userId !== actorUserId) : entries;
}

/**
 * Avisos dentro de la app. Cada productor (eventos, setlists, invitaciones) llama a un metodo de aqui; este decide a
 * quien avisar, con que texto y a donde lleva. Crear avisos nunca rompe la accion principal: si falla, solo se registra.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Crea los avisos; los repetidos (mismo dedupeKey para la misma persona) se ignoran. */
  async notify(entries: NotificationInput[], actorUserId?: string) {
    const data = withoutActor(entries, actorUserId);
    if (data.length === 0) return 0;
    try {
      const result = await this.prisma.notification.createMany({ data, skipDuplicates: true });
      return result.count;
    } catch (error) {
      this.logger.warn(`No se pudieron crear avisos: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  // --- Productores ---

  eventTeamAdded(event: { id: string; name: string; organizationId: string }, eventMusician: { id: string; userId: string }, actorUserId: string) {
    return this.notify(
      [
        {
          userId: eventMusician.userId,
          organizationId: event.organizationId,
          type: 'EVENT_TEAM_ADDED',
          title: `Te sumaron al equipo de ${event.name}`,
          body: 'Confirma si vas desde el evento.',
          link: `/events/${event.id}`,
          dedupeKey: `event-team:${eventMusician.id}`,
        },
      ],
      actorUserId,
    );
  }

  /** Cancelado o cambio de fecha: avisa a todo el equipo del evento. */
  eventChanged(
    event: { id: string; name: string; organizationId: string; startsAt: Date; musicians: { membership: { user: { id: string } } }[] },
    change: 'CANCELLED' | 'RESCHEDULED',
    actorUserId: string,
  ) {
    const entries = event.musicians.map(({ membership }) =>
      change === 'CANCELLED'
        ? {
            userId: membership.user.id,
            organizationId: event.organizationId,
            type: 'EVENT_CANCELLED' as const,
            title: `Se canceló ${event.name}`,
            link: `/events/${event.id}`,
            dedupeKey: `event-cancelled:${event.id}`,
          }
        : {
            userId: membership.user.id,
            organizationId: event.organizationId,
            type: 'EVENT_RESCHEDULED' as const,
            title: `${event.name} cambió de fecha`,
            body: 'Revisa la nueva fecha y hora en el evento.',
            link: `/events/${event.id}`,
            dedupeKey: `event-rescheduled:${event.id}:${event.startsAt.toISOString()}`,
          },
    );
    return this.notify(entries, actorUserId);
  }

  setlistParticipantAdded(setlist: { id: string; name: string; organizationId: string }, participant: { id: string; userId: string }, actorUserId: string) {
    return this.notify(
      [
        {
          userId: participant.userId,
          organizationId: setlist.organizationId,
          type: 'SETLIST_PARTICIPANT_ADDED',
          title: `Te sumaron al setlist ${setlist.name}`,
          link: `/setlists/${setlist.id}`,
          dedupeKey: `setlist-participant:${participant.id}`,
        },
      ],
      actorUserId,
    );
  }

  setlistAssignmentAdded(
    setlist: { id: string; name: string; organizationId: string },
    assignment: { id: string; userId: string; itemTitle: string },
    actorUserId: string,
  ) {
    return this.notify(
      [
        {
          userId: assignment.userId,
          organizationId: setlist.organizationId,
          type: 'SETLIST_ASSIGNMENT_ADDED',
          title: `Tienes una asignación nueva en ${setlist.name}`,
          body: `En «${assignment.itemTitle}».`,
          link: `/setlists/${setlist.id}`,
          dedupeKey: `setlist-assignment:${assignment.id}`,
        },
      ],
      actorUserId,
    );
  }

  /** Al publicar un setlist, avisa a sus participantes. `publishedAt` separa una publicacion de otra. */
  async setlistPublished(setlist: { id: string; name: string; organizationId: string }, publishedAt: Date, actorUserId: string) {
    const participants = await this.prisma.setlistParticipant.findMany({
      where: { setlistId: setlist.id, membership: { status: 'ACTIVE' } },
      select: { membership: { select: { userId: true } } },
    });
    return this.notify(
      participants.map(({ membership }) => ({
        userId: membership.userId,
        organizationId: setlist.organizationId,
        type: 'SETLIST_PUBLISHED' as const,
        title: `Se publicó el setlist ${setlist.name}`,
        body: 'Ya puedes ver el orden final y prepararte.',
        link: `/setlists/${setlist.id}`,
        dedupeKey: `setlist-published:${setlist.id}:${publishedAt.toISOString()}`,
      })),
      actorUserId,
    );
  }

  /** Invitacion a una persona que ya tiene cuenta con ese correo (si no tiene, la vera al registrarse en Mis invitaciones). */
  async invitationReceived(invitation: { id: string; email: string; organizationId: string }, actorUserId: string) {
    const [user, organization] = await Promise.all([
      this.prisma.user.findFirst({ where: { email: { equals: invitation.email, mode: 'insensitive' } }, select: { id: true } }),
      this.prisma.organization.findUnique({ where: { id: invitation.organizationId }, select: { name: true } }),
    ]);
    if (!user || !organization) return 0;
    return this.notify(
      [
        {
          userId: user.id,
          organizationId: invitation.organizationId,
          type: 'INVITATION_RECEIVED',
          title: `${organization.name} te invitó a unirte`,
          body: 'Acepta o rechaza la invitación en Mis invitaciones.',
          link: '/invitations',
          dedupeKey: `invitation:${invitation.id}`,
        },
      ],
      actorUserId,
    );
  }

  /** Al responder una invitacion, su aviso queda leido. */
  async markInvitationHandled(userId: string, invitationId: string) {
    await this.prisma.notification.updateMany({ where: { userId, dedupeKey: `invitation:${invitationId}`, readAt: null }, data: { readAt: new Date() } });
  }

  /**
   * Recordatorios: eventos que empiezan dentro de las proximas 24 h (pendientes o confirmados, en organizaciones no
   * archivadas) para quien todavia no respondio su asistencia. Seguro con varias instancias gracias a dedupeKey.
   */
  async sendDueEventReminders(now = new Date()) {
    const pending = await this.prisma.eventMusician.findMany({
      where: {
        status: 'PENDING',
        membership: { status: 'ACTIVE' },
        event: {
          status: { in: ['PENDING', 'CONFIRMED'] },
          startsAt: { gt: now, lte: new Date(now.getTime() + EVENT_REMINDER_WINDOW_MS) },
          organization: { archivedAt: null },
        },
      },
      select: { id: true, membership: { select: { userId: true } }, event: { select: { id: true, name: true, organizationId: true, startsAt: true } } },
    });
    return this.notify(
      pending.map(({ id, membership, event }) => ({
        userId: membership.userId,
        organizationId: event.organizationId,
        type: 'EVENT_REMINDER' as const,
        title: `Pronto: ${event.name}`,
        body: 'Empieza en menos de 24 horas y todavía no confirmaste si vas.',
        link: `/events/${event.id}`,
        dedupeKey: `event-reminder:${id}:${event.startsAt.toISOString()}`,
      })),
    );
  }

  // --- Bandeja de la persona ---

  /**
   * Lo que ve la persona: los avisos de la organizacion activa (si es miembro activo de ella) mas sus invitaciones,
   * que son de organizaciones donde todavia no esta.
   */
  private async scope(userId: string, organizationId?: string): Promise<Prisma.NotificationWhereInput> {
    const member = organizationId
      ? await this.prisma.membership.findFirst({ where: { userId, organizationId, status: 'ACTIVE' }, select: { id: true } })
      : null;
    return { userId, OR: [{ type: 'INVITATION_RECEIVED' }, ...(member ? [{ organizationId }] : [])] };
  }

  async list(userId: string, organizationId: string | undefined, query: NotificationsListQueryData) {
    const { limit, cursor } = query;
    const where = await this.scope(userId, organizationId);
    const rows = await this.prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: notificationSelect,
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null, unread: await this.prisma.notification.count({ where: { ...where, readAt: null } }) };
  }

  async unreadCount(userId: string, organizationId?: string) {
    return { unread: await this.prisma.notification.count({ where: { ...(await this.scope(userId, organizationId)), readAt: null } }) };
  }

  /** Marcar uno: solo si es de la persona (si no, 404, igual que si no existiera). */
  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId }, select: { id: true, readAt: true } });
    if (!notification) throw new NotFoundException('Aviso no encontrado');
    if (notification.readAt) return this.prisma.notification.findUniqueOrThrow({ where: { id }, select: notificationSelect });
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() }, select: notificationSelect });
  }

  async markAllRead(userId: string, organizationId?: string) {
    const result = await this.prisma.notification.updateMany({ where: { ...(await this.scope(userId, organizationId)), readAt: null }, data: { readAt: new Date() } });
    return { updated: result.count };
  }
}
