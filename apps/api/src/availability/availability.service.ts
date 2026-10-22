import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateUnavailabilityData, TeamAvailabilityQueryData, UnavailabilityRangeQueryData } from '@harmonyhub/contracts';
import type { Prisma } from '@prisma/client';
import type { OrgMember } from '../permissions/current-membership.decorator';
import { PrismaService } from '../prisma/prisma.service';
import {
  addDays,
  daysBetween,
  eventWindow,
  formatDay,
  localDay,
  MAX_QUERY_DAYS,
  MAX_UNAVAILABILITY_ROWS,
  parseDay,
  rankForRole,
  safeTimeZone,
  windowsOverlap,
} from './availability.utils';

const mineSelect = { id: true, startsOn: true, endsOn: true, note: true, createdAt: true } as const;
const eventSelect = { id: true, name: true, startsAt: true, endsAt: true } as const;
/** Cuanto antes de un evento se buscan otros que puedan seguir en curso (eventos de mas de 2 dias no se cuentan). */
const OVERLAP_LOOKBACK_DAYS = 2;

type EventWindowRow = Prisma.EventGetPayload<{ select: typeof eventSelect }>;

function toMine(row: Prisma.UnavailabilityGetPayload<{ select: typeof mineSelect }>) {
  return { id: row.id, startsOn: formatDay(row.startsOn), endsOn: formatDay(row.endsOn), note: row.note, createdAt: row.createdAt };
}

/** Rangos que tocan los dias [from, to] (ambos incluidos). */
const touching = (from: Date, to: Date) => ({ startsOn: { lte: to }, endsOn: { gte: from } });

/**
 * Disponibilidad de los musicos. Cada persona maneja sus fechas bloqueadas (valen en todas sus organizaciones)
 * y los lideres solo ven "No disponible" de los miembros de su organizacion: la nota nunca sale de "Mi perfil".
 * Los choques solo avisan; nunca impiden sumar a alguien.
 */
@Injectable()
export class AvailabilityService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listMine(userId: string) {
    const rows = await this.prisma.unavailability.findMany({ where: { userId }, select: mineSelect, orderBy: [{ startsOn: 'asc' }, { createdAt: 'asc' }] });
    return rows.map(toMine);
  }

  async createMine(userId: string, data: CreateUnavailabilityData) {
    if ((await this.prisma.unavailability.count({ where: { userId } })) >= MAX_UNAVAILABILITY_ROWS) {
      throw new BadRequestException('Tienes demasiadas fechas guardadas: borra algunas que ya pasaron');
    }
    const row = await this.prisma.unavailability.create({
      data: { userId, startsOn: parseDay(data.startsOn)!, endsOn: parseDay(data.endsOn)!, note: data.note },
      select: mineSelect,
    });
    return toMine(row);
  }

  async deleteMine(userId: string, id: string) {
    const { count } = await this.prisma.unavailability.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException('Fecha no encontrada');
    return { ok: true };
  }

  /** Quien de la organizacion no esta disponible entre dos dias (por defecto, los proximos 30). */
  async unavailableInRange(member: OrgMember, query: UnavailabilityRangeQueryData) {
    const from = query.from ? parseDay(query.from)! : parseDay(formatDay(new Date()))!;
    const to = query.to ? parseDay(query.to)! : addDays(from, 30);
    if (to < from) throw new BadRequestException('La fecha hasta no puede ser anterior a la fecha desde');
    if (daysBetween(from, to) + 1 > MAX_QUERY_DAYS) throw new BadRequestException(`Consulta como maximo ${MAX_QUERY_DAYS} dias`);

    const memberships = await this.prisma.membership.findMany({
      where: { organizationId: member.organizationId, status: 'ACTIVE', user: { active: true, unavailability: { some: touching(from, to) } } },
      select: { id: true, userId: true, user: { select: { name: true, unavailability: { where: touching(from, to), select: { startsOn: true, endsOn: true }, orderBy: { startsOn: 'asc' } } } } },
      orderBy: { user: { name: 'asc' } },
    });
    return {
      from: formatDay(from),
      to: formatDay(to),
      items: memberships.map((row) => ({
        membershipId: row.id,
        userId: row.userId,
        name: row.user.name,
        ranges: row.user.unavailability.map((range) => ({ startsOn: formatDay(range.startsOn), endsOn: formatDay(range.endsOn) })),
      })),
    };
  }

  async forEvent(member: OrgMember, eventId: string, query: TeamAvailabilityQueryData) {
    const event = await this.prisma.event.findFirst({ where: { id: eventId, organizationId: member.organizationId }, select: eventSelect });
    if (!event) throw new NotFoundException('Evento no encontrado');
    return this.build(member.organizationId, event, query);
  }

  /** Un setlist no tiene fecha: se usa el proximo evento que lo toca (si no hay, no hay nada que avisar). */
  async forSetlist(member: OrgMember, setlistId: string, query: TeamAvailabilityQueryData) {
    const setlist = await this.prisma.setlist.findFirst({ where: { id: setlistId, organizationId: member.organizationId }, select: { id: true } });
    if (!setlist) throw new NotFoundException('Setlist no encontrado');
    const event = await this.prisma.event.findFirst({
      where: { setlistId, organizationId: member.organizationId, status: { notIn: ['CANCELLED', 'FINISHED'] }, startsAt: { gte: addDays(new Date(), -1) } },
      select: eventSelect,
      orderBy: { startsAt: 'asc' },
    });
    if (!event) return { event: null, members: [], suggestions: [] };
    return this.build(member.organizationId, event, query);
  }

  /**
   * Para cada miembro activo: si bloqueo algun dia del evento (en la zona horaria de quien consulta) y en que otros
   * eventos de esta organizacion esta a la misma hora (sin contar cancelados ni a quien ya dijo que no va).
   */
  private async build(organizationId: string, event: EventWindowRow, query: TeamAvailabilityQueryData) {
    const timeZone = safeTimeZone(query.tz);
    const { role } = query;
    const window = eventWindow(event);
    const firstDay = parseDay(localDay(event.startsAt, timeZone))!;
    const lastDay = parseDay(localDay(event.endsAt ?? event.startsAt, timeZone))!;

    const [memberships, others] = await Promise.all([
      this.prisma.membership.findMany({
        where: { organizationId, status: 'ACTIVE', user: { active: true } },
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              name: true,
              instruments: { select: { instrument: true, isPrimary: true } },
              unavailability: { where: touching(firstDay, lastDay), select: { id: true }, take: 1 },
            },
          },
        },
      }),
      this.prisma.event.findMany({
        where: {
          organizationId,
          id: { not: event.id },
          status: { not: 'CANCELLED' },
          startsAt: { lt: window.end, gte: addDays(window.start, -OVERLAP_LOOKBACK_DAYS) },
        },
        select: { ...eventSelect, musicians: { where: { status: { not: 'DECLINED' } }, select: { membershipId: true } } },
      }),
    ]);

    const conflicts = new Map<string, { eventId: string; name: string; startsAt: Date }[]>();
    for (const other of others) {
      if (!windowsOverlap(window, eventWindow(other))) continue;
      for (const { membershipId } of other.musicians) {
        conflicts.set(membershipId, [...(conflicts.get(membershipId) ?? []), { eventId: other.id, name: other.name, startsAt: other.startsAt }]);
      }
    }

    const members = memberships
      .map((row) => ({
        membershipId: row.id,
        userId: row.userId,
        name: row.user.name,
        unavailable: row.user.unavailability.length > 0,
        conflicts: conflicts.get(row.id) ?? [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    const instruments = new Map(memberships.map((row) => [row.id, row.user.instruments]));
    const available = members.filter((item) => !item.unavailable && item.conflicts.length === 0);
    const suggestions = role
      ? rankForRole(available.map((item) => ({ ...item, instruments: instruments.get(item.membershipId) ?? [] })), role).map(({ member: item, isPrimary }) => ({
          membershipId: item.membershipId,
          name: item.name,
          isPrimary,
        }))
      : [];

    return {
      event: { id: event.id, name: event.name, startsAt: event.startsAt, endsAt: event.endsAt },
      members,
      suggestions,
    };
  }
}
