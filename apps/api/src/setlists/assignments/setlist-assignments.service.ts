import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { updateAssignmentPreparationSchema, type CopySetlistAssignmentsData, type CreateSetlistAssignmentData, type UpdateSetlistAssignmentData } from '@harmonyhub/contracts';
import { parseOrBadRequest } from '../../shared/zod.pipe';
import { PermissionsService } from '../../permissions/permissions.service';
import { SetlistItemsRepository } from '../items/setlist-items.repository';
import { NotificationsService } from '../../notifications/notifications.service';
import { SetlistsAccessService } from '../setlists-access.service';
import { mapSetlistAssignment, mapSetlistParticipant, mapSetlistRoleRequirement } from './setlist-assignment.mapper';
import { computeCoverage } from './setlist-assignment.utils';
import { SetlistAssignmentsRepository } from './setlist-assignments.repository';
import { SetlistParticipantsRepository } from './setlist-participants.repository';
import { SetlistRoleRequirementsRepository } from './setlist-role-requirements.repository';
import type { OrgMember } from '../../permissions/current-membership.decorator';

@Injectable()
export class SetlistAssignmentsService {
  constructor(
    @Inject(SetlistAssignmentsRepository) private readonly assignmentsRepository: SetlistAssignmentsRepository,
    @Inject(SetlistParticipantsRepository) private readonly participantsRepository: SetlistParticipantsRepository,
    @Inject(SetlistRoleRequirementsRepository) private readonly requirementsRepository: SetlistRoleRequirementsRepository,
    @Inject(SetlistItemsRepository) private readonly itemsRepository: SetlistItemsRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
    @Inject(SetlistsAccessService) private readonly access: SetlistsAccessService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async list(member: OrgMember, setlistId: string, itemId: string) {
    const { organizationId } = member;
    await this.access.assertItemInSetlist(organizationId, setlistId, itemId);
    const assignments = await this.assignmentsRepository.listByItem(itemId);
    return assignments.map(mapSetlistAssignment);
  }

  async create(member: OrgMember, setlistId: string, itemId: string, data: CreateSetlistAssignmentData) {
    const { userId, organizationId } = member;
    const item = await this.access.assertItemInSetlist(organizationId, setlistId, itemId);
    const setlist = await this.access.assertSetlistInOrg(organizationId, setlistId);

    const participant = await this.assignmentsRepository.findParticipantInSetlist(setlistId, data.participantId);
    if (!participant) throw new BadRequestException('El participante no pertenece a este setlist');

    const sortOrder = await this.assignmentsRepository.countByItem(itemId);
    const created = await this.assignmentsRepository.create({
      setlistItemId: itemId,
      participantId: data.participantId,
      role: data.role,
      instrument: data.instrument ?? null,
      label: data.label ?? null,
      isPrimary: data.isPrimary ?? false,
      isRequired: data.isRequired ?? true,
      sortOrder,
      createdById: userId,
    });
    await this.notifications.setlistAssignmentAdded(
      { id: setlistId, name: setlist.name, organizationId },
      { id: created.id, userId: created.participant.membership.user.id, itemTitle: item.title },
      userId,
    );
    return mapSetlistAssignment(created);
  }

  async update(member: OrgMember, setlistId: string, itemId: string, assignmentId: string, data: UpdateSetlistAssignmentData) {
    const { organizationId } = member;
    await this.access.assertItemInSetlist(organizationId, setlistId, itemId);
    const existing = await this.findAssignment(itemId, assignmentId);

    const updated = await this.assignmentsRepository.update(assignmentId, itemId, data.role ?? existing.role, data);
    return mapSetlistAssignment(updated);
  }

  async remove(member: OrgMember, setlistId: string, itemId: string, assignmentId: string) {
    const { organizationId } = member;
    await this.access.assertItemInSetlist(organizationId, setlistId, itemId);
    await this.findAssignment(itemId, assignmentId);

    await this.assignmentsRepository.delete(assignmentId);
    return { ok: true };
  }

  async updatePreparation(member: OrgMember, setlistId: string, itemId: string, assignmentId: string, body: unknown) {
    const { userId, organizationId } = member;
    await this.access.assertItemInSetlist(organizationId, setlistId, itemId);
    const existing = await this.findAssignment(itemId, assignmentId);

    const isOwnAssignment = existing.participant.membership.user.id === userId;
    const allowed = this.permissions.canUpdateOwnPreparationStatus(isOwnAssignment) || this.permissions.canUpdateAnyPreparationStatus(member.role);
    if (!allowed) throw new ForbiddenException('No puedes actualizar el estado de preparacion de otro musico');

    // Se valida aqui y no con ZodPipe: quien no tiene permiso recibe 403 aunque el cuerpo sea invalido.
    const data = parseOrBadRequest(updateAssignmentPreparationSchema, body);
    const updated = await this.assignmentsRepository.updatePreparation(assignmentId, data.preparationStatus, data.preparationNote);
    return mapSetlistAssignment(updated);
  }

  async copy(member: OrgMember, setlistId: string, itemId: string, data: CopySetlistAssignmentsData) {
    const { organizationId } = member;
    await this.access.assertItemInSetlist(organizationId, setlistId, itemId);

    const source = await this.itemsRepository.findItem(setlistId, data.sourceItemId);
    if (!source) throw new BadRequestException('El item de origen no pertenece a este setlist');

    const copied = await this.assignmentsRepository.copy(data.sourceItemId, itemId, data.mode ?? 'ALL', data.replaceExisting ?? false);
    return copied.map(mapSetlistAssignment);
  }

  async team(member: OrgMember, setlistId: string) {
    const { organizationId } = member;
    await this.access.assertSetlistInOrg(organizationId, setlistId);

    const [participants, assignments, requirements, items] = await Promise.all([
      this.participantsRepository.list(setlistId),
      this.assignmentsRepository.listBySetlist(setlistId),
      this.requirementsRepository.listBySetlist(setlistId),
      this.itemsRepository.listItems(setlistId),
    ]);

    const counts = await this.participantsRepository.assignmentCounts(participants.map((participant) => participant.id));

    const assignmentsByItem = new Map<string, typeof assignments>();
    for (const assignment of assignments) {
      const list = assignmentsByItem.get(assignment.setlistItemId) ?? [];
      list.push(assignment);
      assignmentsByItem.set(assignment.setlistItemId, list);
    }

    const requirementsByItem = new Map<string, typeof requirements>();
    for (const requirement of requirements) {
      const list = requirementsByItem.get(requirement.setlistItemId) ?? [];
      list.push(requirement);
      requirementsByItem.set(requirement.setlistItemId, list);
    }

    const itemsCoverage = items.map((item) => {
      const itemAssignments = assignmentsByItem.get(item.id) ?? [];
      const itemRequirements = requirementsByItem.get(item.id) ?? [];
      const coverage = computeCoverage(itemAssignments, itemRequirements);
      return {
        itemId: item.id,
        assignments: itemAssignments.map(mapSetlistAssignment),
        requirements: itemRequirements.map(mapSetlistRoleRequirement),
        coverage,
      };
    });

    const missingRolesCount = itemsCoverage.reduce((sum, entry) => sum + entry.coverage.missingRoles.length, 0);

    return {
      participants: participants.map((participant) => mapSetlistParticipant(participant, counts)),
      items: itemsCoverage,
      missingRolesCount,
    };
  }

  private async findAssignment(itemId: string, assignmentId: string) {
    const assignment = await this.assignmentsRepository.findById(itemId, assignmentId);
    if (!assignment) throw new NotFoundException('Asignacion no encontrada');
    return assignment;
  }
}
