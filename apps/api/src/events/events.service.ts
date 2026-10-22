import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AddEventMusicianData, CreateEventData, EventListQueryData, UpdateEventData, UpdateEventMusicianData } from '@harmonyhub/contracts';
import { PermissionsService } from '../permissions/permissions.service';
import { clean } from '../shared/object.utils';
import { mapEventDetail, mapEventSummary } from './event.mapper';
import {
  assertEventStatusTransition,
  assertValidEventSchedule,
  EventStatus,
  InvalidEventScheduleError,
  InvalidEventStatusTransitionError,
  isEventLocked,
} from './event.utils';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsRepository } from './events.repository';
import type { OrgMember } from '../permissions/current-membership.decorator';

@Injectable()
export class EventsService {
  constructor(
    @Inject(EventsRepository) private readonly eventsRepository: EventsRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async list(member: OrgMember, query: EventListQueryData) {
    const { userId, organizationId } = member;
    const { page, pageSize, ...filters } = query;
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

  async detail(member: OrgMember, id: string) {
    const { userId, organizationId } = member;
    return mapEventDetail(await this.findOwnedEvent(organizationId, id), userId);
  }

  async create(member: OrgMember, data: CreateEventData) {
    const { userId, organizationId } = member;

    this.assertSchedule(data.startsAt, data.endsAt);
    if (data.setlistId) await this.assertLinkableSetlist(organizationId, data.setlistId);

    const created = await this.eventsRepository.create({
      organizationId,
      name: data.name,
      startsAt: data.startsAt,
      endsAt: data.endsAt ?? null,
      location: data.location || null,
      description: data.description || null,
      setlistId: data.setlistId ?? null,
      status: data.status || 'DRAFT',
    });
    return mapEventDetail(created, userId);
  }

  async update(member: OrgMember, id: string, data: UpdateEventData) {
    const { userId, organizationId } = member;
    const current = await this.findOwnedEvent(organizationId, id);
    const { status, ...fields } = data;
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
    if (status === 'CANCELLED' && current.status !== 'CANCELLED') {
      await this.notifications.eventChanged(updated, 'CANCELLED', userId);
    } else if (fields.startsAt && fields.startsAt.getTime() !== current.startsAt.getTime() && updated.status !== 'CANCELLED') {
      await this.notifications.eventChanged(updated, 'RESCHEDULED', userId);
    }
    return mapEventDetail(updated, userId);
  }

  async delete(member: OrgMember, id: string) {
    const { organizationId } = member;
    await this.findOwnedEvent(organizationId, id);
    await this.eventsRepository.delete(id);
    return { ok: true };
  }

  async addMusician(member: OrgMember, eventId: string, data: AddEventMusicianData) {
    const { organizationId } = member;
    const event = await this.findOwnedEvent(organizationId, eventId);
    this.assertEditableTeam(event.status as EventStatus);

    const membership = await this.eventsRepository.findActiveMembership(data.membershipId, organizationId);
    if (!membership) throw new NotFoundException('Miembro no encontrado en la organizacion');

    const existing = await this.eventsRepository.findMusicianByMembership(eventId, membership.id);
    if (existing) throw new ConflictException('Ese miembro ya esta en el equipo del evento');

    const added = await this.eventsRepository.addMusician({
      eventId,
      membershipId: membership.id,
      instrument: data.instrument || null,
      note: data.note || null,
    });
    await this.notifications.eventTeamAdded(event, { id: added.id, userId: membership.userId }, member.userId);
    return this.detail(member, eventId);
  }

  async updateMusician(member: OrgMember, eventId: string, musicianId: string, data: UpdateEventMusicianData) {
    const { userId, organizationId } = member;
    const event = await this.findOwnedEvent(organizationId, eventId);
    this.assertEditableTeam(event.status as EventStatus);

    const musician = await this.eventsRepository.findMusician(eventId, musicianId);
    if (!musician) throw new NotFoundException('Musico no encontrado en el evento');

    const isSelf = musician.membership.userId === userId;
    const canManage = this.permissions.can(member.role, 'events.manage');
    if (data.status && !this.permissions.canUpdateEventAttendance(member.role, isSelf)) {
      throw new ForbiddenException('Solo puedes responder tu propia asistencia');
    }
    if ((data.instrument !== undefined || data.note !== undefined) && !canManage && !isSelf) {
      throw new ForbiddenException('No tienes permisos para editar este musico');
    }
    if (data.instrument !== undefined && !canManage) {
      throw new ForbiddenException('Solo un lider puede cambiar el instrumento asignado');
    }

    await this.eventsRepository.updateMusician(
      musicianId,
      clean({
        status: data.status,
        instrument: data.instrument === undefined ? undefined : data.instrument || null,
        note: data.note === undefined ? undefined : data.note || null,
      }),
    );
    return this.detail(member, eventId);
  }

  async removeMusician(member: OrgMember, eventId: string, musicianId: string) {
    const { organizationId } = member;
    const event = await this.findOwnedEvent(organizationId, eventId);
    this.assertEditableTeam(event.status as EventStatus);

    const musician = await this.eventsRepository.findMusician(eventId, musicianId);
    if (!musician) throw new NotFoundException('Musico no encontrado en el evento');

    await this.eventsRepository.removeMusician(musicianId);
    return this.detail(member, eventId);
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
}
