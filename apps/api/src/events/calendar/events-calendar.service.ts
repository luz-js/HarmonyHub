import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { OrgMember } from '../../permissions/current-membership.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { buildCalendar, icsFileName, type IcsEvent } from './ical';

const eventSelect = {
  id: true,
  name: true,
  startsAt: true,
  endsAt: true,
  location: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  setlist: { select: { name: true } },
} as const;

type EventRow = {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  description: string | null;
  status: IcsEvent['status'];
  createdAt: Date;
  updatedAt: Date;
  setlist: { name: string } | null;
};

const toIcs = ({ setlist, ...event }: EventRow): IcsEvent => ({ ...event, setlistName: setlist?.name ?? null });

/** Cuantos dias hacia atras se incluyen en "mis proximos eventos" (lo de hoy que ya empezo tambien cuenta). */
const UPCOMING_GRACE_MS = 24 * 60 * 60 * 1000;
const MAX_EVENTS = 200;

/** Exportar eventos a un calendario (.ics). Se descargan con la sesion normal; no hay URL de suscripcion. */
@Injectable()
export class EventsCalendarService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Un evento de la organizacion activa (cualquier miembro con lectura; los cancelados salen como cancelados). */
  async eventCalendar(member: OrgMember, eventId: string, now = new Date()) {
    const event = await this.prisma.event.findFirst({ where: { id: eventId, organizationId: member.organizationId }, select: eventSelect });
    if (!event) throw new NotFoundException('Evento no encontrado');
    return { fileName: icsFileName(event.name), body: buildCalendar({ name: event.name, events: [toIcs(event)], now }) };
  }

  /**
   * "Mis proximos eventos": los de la organizacion activa donde estoy en el equipo y no dije que no voy, sin los
   * cancelados, desde ayer en adelante.
   */
  async myUpcomingCalendar(member: OrgMember, now = new Date()) {
    const organization = await this.prisma.organization.findUnique({ where: { id: member.organizationId }, select: { name: true } });
    const events = await this.prisma.event.findMany({
      where: {
        organizationId: member.organizationId,
        status: { not: 'CANCELLED' },
        startsAt: { gte: new Date(now.getTime() - UPCOMING_GRACE_MS) },
        musicians: { some: { membershipId: member.id, status: { not: 'DECLINED' } } },
      },
      orderBy: { startsAt: 'asc' },
      take: MAX_EVENTS,
      select: eventSelect,
    });
    const organizationName = organization?.name ?? 'HarmonyHub';
    return {
      fileName: icsFileName(`mis eventos ${organizationName}`, 'mis-eventos'),
      body: buildCalendar({ name: `Mis eventos · ${organizationName}`, events: events.map(toIcs), now }),
    };
  }
}
