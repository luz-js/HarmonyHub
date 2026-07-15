import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { PermissionsService } from '../../permissions/permissions.service';
import { SetlistsRepository } from '../setlists.repository';
import { mapSetlistParticipant } from './setlist-assignment.mapper';
import { SetlistParticipantsRepository } from './setlist-participants.repository';

const PARTICIPANT_STATUSES = ['INVITED', 'CONFIRMED', 'DECLINED', 'TENTATIVE', 'NOT_REQUIRED'] as const;

const addParticipantSchema = z.object({
  membershipId: z.string().trim().min(1),
  status: z.enum(PARTICIPANT_STATUSES).optional(),
  generalRole: z.string().trim().max(120).optional().nullable(),
  generalNote: z.string().trim().max(2000).optional().nullable(),
});

const updateParticipantSchema = z.object({
  status: z.enum(PARTICIPANT_STATUSES).optional(),
  generalRole: z.string().trim().max(120).optional().nullable(),
  generalNote: z.string().trim().max(2000).optional().nullable(),
});

@Injectable()
export class SetlistParticipantsService {
  constructor(
    @Inject(SetlistParticipantsRepository) private readonly participantsRepository: SetlistParticipantsRepository,
    @Inject(SetlistsRepository) private readonly setlistsRepository: SetlistsRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async list(userId: string, organizationId: string, setlistId: string) {
    await this.assertView(userId, organizationId);
    await this.assertSetlistInOrg(organizationId, setlistId);
    const participants = await this.participantsRepository.list(setlistId);
    const counts = await this.participantsRepository.assignmentCounts(participants.map((participant) => participant.id));
    return participants.map((participant) => mapSetlistParticipant(participant, counts));
  }

  /** Reutilizado por SetlistAssignmentsService al asignar un miembro que aun no es participante. */
  async ensureParticipant(setlistId: string, membershipId: string, addedById: string) {
    const existing = await this.participantsRepository.findByMembership(setlistId, membershipId);
    if (existing) return existing;
    return this.participantsRepository.create({ setlistId, membershipId, status: 'CONFIRMED', addedById });
  }

  async add(userId: string, organizationId: string, setlistId: string, body: Record<string, unknown>) {
    await this.assertManage(userId, organizationId);
    await this.assertSetlistInOrg(organizationId, setlistId);

    const parsed = addParticipantSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const membership = await this.participantsRepository.findMembershipForValidation(parsed.data.membershipId, organizationId);
    if (!membership) throw new BadRequestException('La membresia no existe en esta organizacion');
    if (membership.status !== 'ACTIVE') throw new BadRequestException('La membresia debe estar activa');

    const existing = await this.participantsRepository.findByMembership(setlistId, parsed.data.membershipId);
    if (existing) throw new BadRequestException('Este miembro ya es participante de este setlist');

    const created = await this.participantsRepository.create({
      setlistId,
      membershipId: parsed.data.membershipId,
      status: parsed.data.status || 'CONFIRMED',
      generalRole: parsed.data.generalRole ?? null,
      generalNote: parsed.data.generalNote ?? null,
      addedById: userId,
    });
    return mapSetlistParticipant(created, []);
  }

  async update(userId: string, organizationId: string, setlistId: string, participantId: string, body: Record<string, unknown>) {
    await this.assertManage(userId, organizationId);
    await this.assertSetlistInOrg(organizationId, setlistId);
    await this.findParticipant(setlistId, participantId);

    const parsed = updateParticipantSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const updated = await this.participantsRepository.update(participantId, {
      status: parsed.data.status,
      generalRole: parsed.data.generalRole,
      generalNote: parsed.data.generalNote,
      respondedAt: parsed.data.status && parsed.data.status !== 'INVITED' ? new Date() : undefined,
    });
    const counts = await this.participantsRepository.assignmentCounts([participantId]);
    return mapSetlistParticipant(updated, counts);
  }

  async remove(userId: string, organizationId: string, setlistId: string, participantId: string, removeAssignments: boolean) {
    await this.assertManage(userId, organizationId);
    await this.assertSetlistInOrg(organizationId, setlistId);
    await this.findParticipant(setlistId, participantId);

    const assignmentsCount = await this.participantsRepository.countAssignments(participantId);
    if (assignmentsCount > 0 && !removeAssignments) {
      throw new BadRequestException(`Este participante tiene ${assignmentsCount} asignacion(es); confirma con removeAssignments=true para eliminarlas tambien`);
    }

    if (assignmentsCount > 0) await this.participantsRepository.deleteWithAssignments(participantId);
    else await this.participantsRepository.delete(participantId);

    return { ok: true };
  }

  private async findParticipant(setlistId: string, participantId: string) {
    const participant = await this.participantsRepository.findById(setlistId, participantId);
    if (!participant) throw new NotFoundException('Participante no encontrado');
    return participant;
  }

  private async assertView(userId: string, organizationId: string) {
    const membership = await this.permissions.assertOrganizationMember(userId, organizationId);
    if (!this.permissions.canViewSetlistAssignments(membership.role)) throw new ForbiddenException('No tienes permisos para ver el equipo del setlist');
    return membership;
  }

  private async assertManage(userId: string, organizationId: string) {
    const membership = await this.permissions.assertOrganizationMember(userId, organizationId);
    if (!this.permissions.canManageSetlistParticipants(membership.role)) throw new ForbiddenException('No tienes permisos para gestionar participantes');
    return membership;
  }

  private async assertSetlistInOrg(organizationId: string, setlistId: string) {
    const setlist = await this.setlistsRepository.findById(setlistId, organizationId);
    if (!setlist) throw new NotFoundException('Setlist no encontrado');
    return setlist;
  }
}
