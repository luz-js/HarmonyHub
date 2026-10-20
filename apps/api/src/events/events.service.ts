import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { z } from 'zod';
import { PermissionsService } from '../permissions/permissions.service';
import { clean } from '../shared/object.utils';
import { parseBooleanQueryParam } from '../setlists/setlist.utils';
import { mapEventDetail, mapEventSummary } from './event.mapper';
import {
  assertEventStatusTransition,
  assertValidEventSchedule,
  EventStatus,
  InvalidEventScheduleError,
  InvalidEventStatusTransitionError,
  isEventLocked,
} from './event.utils';
import { EventsRepository } from './events.repository';

const eventStatusSchema = z.enum(['DRAFT', 'PENDING', 'CONFIRMED', 'CANCELLED', 'FINISHED']);
const attendanceStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'DECLINED']);
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

const createEventSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(150),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional().nullable(),
  location: optionalText(200),
  description: optionalText(2000),
  setlistId: z.string().trim().min(1).optional().nullable(),
  status: z.enum(['DRAFT', 'PENDING', 'CONFIRMED']).optional(),
});

const updateEventSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(150).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional().nullable(),
  location: optionalText(200),
  description: optionalText(2000),
  setlistId: z.string().trim().min(1).optional().nullable(),
  status: eventStatusSchema.optional(),
});

const listQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: eventStatusSchema.optional(),
  search: z.string().trim().min(1).optional(),
  includeCancelled: z.preprocess(parseBooleanQueryParam, z.boolean().optional()),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
});

const addMusicianSchema = z.object({
  membershipId: z.string().trim().min(1, 'El miembro es requerido'),
  instrument: optionalText(80),
  note: optionalText(500),
});

const updateMusicianSchema = z.object({
  status: attendanceStatusSchema.optional(),
  instrument: optionalText(80),
  note: optionalText(500),
});

@Injectable()
export class EventsService {
  constructor(
    @Inject(EventsRepository) private readonly eventsRepository: EventsRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async list(userId: string, organizationId: string, query: Record<string, unknown>) {
    await this.assertRole(userId, organizationId, (role) => this.permissions.canViewEvents(role), 'No tienes permisos para ver eventos');

    const parsed = listQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Filtros invalidos');

    const { page, pageSize, ...filters } = parsed.data;
    const { items, total } = await this.eventsRepository.list(organizationId, {
      ...filters,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: items.map((event) => mapEventSummary(event, userId)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async detail(userId: string, organizationId: string, id: string) {
    await this.assertRole(userId, organizationId, (role) => this.permissions.canViewEvents(role), 'No tienes permisos para ver eventos');
    return mapEventDetail(await this.findOwnedEvent(organizationId, id), userId);
  }

  async create(userId: string, organizationId: string, body: Record<string, unknown>) {
    await this.assertManage(userId, organizationId);
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    this.assertSchedule(parsed.data.startsAt, parsed.data.endsAt);
    if (parsed.data.setlistId) await this.assertLinkableSetlist(organizationId, parsed.data.setlistId);

    const created = await this.eventsRepository.create({
      organizationId,
      name: parsed.data.name,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt ?? null,
      location: parsed.data.location || null,
      description: parsed.data.description || null,
      setlistId: parsed.data.setlistId ?? null,
      status: parsed.data.status || 'DRAFT',
    });
    return mapEventDetail(created, userId);
  }

  async update(userId: string, organizationId: string, id: string, body: Record<string, unknown>) {
    await this.assertManage(userId, organizationId);
    const current = await this.findOwnedEvent(organizationId, id);
    const parsed = updateEventSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const { status, ...fields } = parsed.data;
    const hasFieldChanges = Object.values(fields).some((value) => value !== undefined);
    if (current.status === 'FINISHED' && hasFieldChanges) {
      throw new BadRequestException('Un evento terminado ya no se puede editar');
    }

    if (status) {
      try {
        assertEventStatusTransition(current.status as EventStatus, status);
      } catch (error) {
        if (error instanceof InvalidEventStatusTransitionError) throw new BadRequestException(error.message);
        throw error;
      }
    }

    const startsAt = fields.startsAt ?? current.startsAt;
    const endsAt = fields.endsAt === undefined ? current.endsAt : fields.endsAt;
    this.assertSchedule(startsAt, endsAt);
    if (fields.setlistId && fields.setlistId !== current.setlist?.id) {
      await this.assertLinkableSetlist(organizationId, fields.setlistId);
    }

    const updated = await this.eventsRepository.update(
      id,
      clean({
        name: fields.name,
        startsAt: fields.startsAt,
        endsAt: fields.endsAt,
        location: fields.location === undefined ? undefined : fields.location || null,
        description: fields.description === undefined ? undefined : fields.description || null,
        setlistId: fields.setlistId,
        status,
      }),
    );
    return mapEventDetail(updated, userId);
  }

  async delete(userId: string, organizationId: string, id: string) {
    await this.assertRole(userId, organizationId, (role) => this.permissions.canDeleteEvents(role), 'No tienes permisos para eliminar eventos');
    await this.findOwnedEvent(organizationId, id);
    await this.eventsRepository.delete(id);
    return { ok: true };
  }

  async addMusician(userId: string, organizationId: string, eventId: string, body: Record<string, unknown>) {
    await this.assertManage(userId, organizationId);
    const event = await this.findOwnedEvent(organizationId, eventId);
    this.assertEditableTeam(event.status as EventStatus);

    const parsed = addMusicianSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const membership = await this.eventsRepository.findActiveMembership(parsed.data.membershipId, organizationId);
    if (!membership) throw new NotFoundException('Miembro no encontrado en la organizacion');

    const existing = await this.eventsRepository.findMusicianByMembership(eventId, membership.id);
    if (existing) throw new ConflictException('Ese miembro ya esta en el equipo del evento');

    await this.eventsRepository.addMusician({
      eventId,
      membershipId: membership.id,
      instrument: parsed.data.instrument || null,
      note: parsed.data.note || null,
    });
    return this.detail(userId, organizationId, eventId);
  }

  async updateMusician(userId: string, organizationId: string, eventId: string, musicianId: string, body: Record<string, unknown>) {
    const membership = await this.permissions.assertOrganizationMember(userId, organizationId);
    const event = await this.findOwnedEvent(organizationId, eventId);
    this.assertEditableTeam(event.status as EventStatus);

    const musician = await this.eventsRepository.findMusician(eventId, musicianId);
    if (!musician) throw new NotFoundException('Musico no encontrado en el evento');

    const parsed = updateMusicianSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const isSelf = musician.membership.userId === userId;
    const canManage = this.permissions.canManageEvents(membership.role);
    if (parsed.data.status && !this.permissions.canUpdateEventAttendance(membership.role, isSelf)) {
      throw new ForbiddenException('Solo puedes responder tu propia asistencia');
    }
    if ((parsed.data.instrument !== undefined || parsed.data.note !== undefined) && !canManage && !isSelf) {
      throw new ForbiddenException('No tienes permisos para editar este musico');
    }
    if (parsed.data.instrument !== undefined && !canManage) {
      throw new ForbiddenException('Solo un lider puede cambiar el instrumento asignado');
    }

    await this.eventsRepository.updateMusician(
      musicianId,
      clean({
        status: parsed.data.status,
        instrument: parsed.data.instrument === undefined ? undefined : parsed.data.instrument || null,
        note: parsed.data.note === undefined ? undefined : parsed.data.note || null,
      }),
    );
    return this.detail(userId, organizationId, eventId);
  }

  async removeMusician(userId: string, organizationId: string, eventId: string, musicianId: string) {
    await this.assertManage(userId, organizationId);
    const event = await this.findOwnedEvent(organizationId, eventId);
    this.assertEditableTeam(event.status as EventStatus);

    const musician = await this.eventsRepository.findMusician(eventId, musicianId);
    if (!musician) throw new NotFoundException('Musico no encontrado en el evento');

    await this.eventsRepository.removeMusician(musicianId);
    return this.detail(userId, organizationId, eventId);
  }

  private async findOwnedEvent(organizationId: string, id: string) {
    const event = await this.eventsRepository.findDetail(id, organizationId);
    if (!event) throw new NotFoundException('Evento no encontrado');
    return event;
  }

  private async assertLinkableSetlist(organizationId: string, setlistId: string) {
    const setlist = await this.eventsRepository.findSetlistInOrganization(setlistId, organizationId);
    if (!setlist) throw new NotFoundException('Setlist no encontrado');
    if (setlist.isTemplate) throw new BadRequestException('Un evento no puede usar una plantilla; crea un setlist desde ella primero');
    if (setlist.status === 'ARCHIVED') throw new BadRequestException('No se puede vincular un setlist archivado');
  }

  private assertSchedule(startsAt: Date, endsAt?: Date | null) {
    try {
      assertValidEventSchedule(startsAt, endsAt);
    } catch (error) {
      if (error instanceof InvalidEventScheduleError) throw new BadRequestException(error.message);
      throw error;
    }
  }

  private assertEditableTeam(status: EventStatus) {
    if (isEventLocked(status)) throw new BadRequestException('El equipo de un evento cancelado o terminado no se puede modificar');
  }

  private assertManage(userId: string, organizationId: string) {
    return this.assertRole(userId, organizationId, (role) => this.permissions.canManageEvents(role), 'No tienes permisos para gestionar eventos');
  }

  private async assertRole(userId: string, organizationId: string, canAccess: (role: MembershipRole) => boolean, message: string) {
    const membership = await this.permissions.assertOrganizationMember(userId, organizationId);
    if (!canAccess(membership.role)) throw new ForbiddenException(message);
    return membership;
  }
}
