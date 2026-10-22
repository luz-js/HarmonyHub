import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AddSetlistParticipantData, UpdateSetlistParticipantData } from '@harmonyhub/contracts';
import { NotificationsService } from '../../notifications/notifications.service';
import { SetlistsAccessService } from '../setlists-access.service';
import { mapSetlistParticipant } from './setlist-assignment.mapper';
import { SetlistParticipantsRepository } from './setlist-participants.repository';
import type { OrgMember } from '../../permissions/current-membership.decorator';

@Injectable()
export class SetlistParticipantsService {
  constructor(
    @Inject(SetlistParticipantsRepository) private readonly participantsRepository: SetlistParticipantsRepository,
    @Inject(SetlistsAccessService) private readonly access: SetlistsAccessService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async list(member: OrgMember, setlistId: string) {
    const { organizationId } = member;
    await this.access.assertSetlistInOrg(organizationId, setlistId);
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

  async add(member: OrgMember, setlistId: string, data: AddSetlistParticipantData) {
    const { userId, organizationId } = member;
    const setlist = await this.access.assertSetlistInOrg(organizationId, setlistId);

    const membership = await this.participantsRepository.findMembershipForValidation(data.membershipId, organizationId);
    if (!membership) throw new BadRequestException('La membresia no existe en esta organizacion');
    if (membership.status !== 'ACTIVE') throw new BadRequestException('La membresia debe estar activa');

    const existing = await this.participantsRepository.findByMembership(setlistId, data.membershipId);
    if (existing) throw new BadRequestException('Este miembro ya es participante de este setlist');

    const created = await this.participantsRepository.create({
      setlistId,
      membershipId: data.membershipId,
      status: data.status || 'CONFIRMED',
      generalRole: data.generalRole ?? null,
      generalNote: data.generalNote ?? null,
      addedById: userId,
    });
    await this.notifications.setlistParticipantAdded({ id: setlistId, name: setlist.name, organizationId }, { id: created.id, userId: created.membership.user.id }, userId);
    return mapSetlistParticipant(created, []);
  }

  async update(member: OrgMember, setlistId: string, participantId: string, data: UpdateSetlistParticipantData) {
    const { organizationId } = member;
    await this.access.assertSetlistInOrg(organizationId, setlistId);
    await this.findParticipant(setlistId, participantId);

    const updated = await this.participantsRepository.update(participantId, {
      status: data.status,
      generalRole: data.generalRole,
      generalNote: data.generalNote,
      respondedAt: data.status && data.status !== 'INVITED' ? new Date() : undefined,
    });
    const counts = await this.participantsRepository.assignmentCounts([participantId]);
    return mapSetlistParticipant(updated, counts);
  }

  async remove(member: OrgMember, setlistId: string, participantId: string, removeAssignments: boolean) {
    const { organizationId } = member;
    await this.access.assertSetlistInOrg(organizationId, setlistId);
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
}
