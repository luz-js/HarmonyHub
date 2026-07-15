import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { PermissionsService } from '../../permissions/permissions.service';
import { SetlistItemsRepository } from '../items/setlist-items.repository';
import { SetlistsRepository } from '../setlists.repository';
import { mapSetlistAssignment, mapSetlistParticipant, mapSetlistRoleRequirement } from './setlist-assignment.mapper';
import { ASSIGNMENT_PREPARATION_STATUSES, computeCoverage, SETLIST_MUSICAL_ROLES } from './setlist-assignment.utils';
import { SetlistAssignmentsRepository } from './setlist-assignments.repository';
import { SetlistParticipantsRepository } from './setlist-participants.repository';
import { SetlistRoleRequirementsRepository } from './setlist-role-requirements.repository';

const createAssignmentSchema = z.object({
  participantId: z.string().trim().min(1),
  role: z.enum(SETLIST_MUSICAL_ROLES),
  instrument: z.string().trim().max(80).optional().nullable(),
  label: z.string().trim().max(120).optional().nullable(),
  isPrimary: z.boolean().optional(),
  isRequired: z.boolean().optional(),
});

const updateAssignmentSchema = z.object({
  role: z.enum(SETLIST_MUSICAL_ROLES).optional(),
  instrument: z.string().trim().max(80).optional().nullable(),
  label: z.string().trim().max(120).optional().nullable(),
  isPrimary: z.boolean().optional(),
  isRequired: z.boolean().optional(),
});

const preparationSchema = z.object({
  preparationStatus: z.enum(ASSIGNMENT_PREPARATION_STATUSES),
  preparationNote: z.string().trim().max(2000).optional().nullable(),
});

const copySchema = z.object({
  sourceItemId: z.string().trim().min(1),
  replaceExisting: z.boolean().optional(),
});

@Injectable()
export class SetlistAssignmentsService {
  constructor(
    @Inject(SetlistAssignmentsRepository) private readonly assignmentsRepository: SetlistAssignmentsRepository,
    @Inject(SetlistParticipantsRepository) private readonly participantsRepository: SetlistParticipantsRepository,
    @Inject(SetlistRoleRequirementsRepository) private readonly requirementsRepository: SetlistRoleRequirementsRepository,
    @Inject(SetlistItemsRepository) private readonly itemsRepository: SetlistItemsRepository,
    @Inject(SetlistsRepository) private readonly setlistsRepository: SetlistsRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async list(userId: string, organizationId: string, setlistId: string, itemId: string) {
    await this.assertView(userId, organizationId);
    await this.assertItemInSetlist(organizationId, setlistId, itemId);
    const assignments = await this.assignmentsRepository.listByItem(itemId);
    return assignments.map(mapSetlistAssignment);
  }

  async create(userId: string, organizationId: string, setlistId: string, itemId: string, body: Record<string, unknown>) {
    await this.assertManage(userId, organizationId);
    await this.assertItemInSetlist(organizationId, setlistId, itemId);

    const parsed = createAssignmentSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const participant = await this.assignmentsRepository.findParticipantInSetlist(setlistId, parsed.data.participantId);
    if (!participant) throw new BadRequestException('El participante no pertenece a este setlist');

    const sortOrder = await this.assignmentsRepository.countByItem(itemId);
    const created = await this.assignmentsRepository.create({
      setlistItemId: itemId,
      participantId: parsed.data.participantId,
      role: parsed.data.role,
      instrument: parsed.data.instrument ?? null,
      label: parsed.data.label ?? null,
      isPrimary: parsed.data.isPrimary ?? false,
      isRequired: parsed.data.isRequired ?? true,
      sortOrder,
      createdById: userId,
    });
    return mapSetlistAssignment(created);
  }

  async update(userId: string, organizationId: string, setlistId: string, itemId: string, assignmentId: string, body: Record<string, unknown>) {
    await this.assertManage(userId, organizationId);
    await this.assertItemInSetlist(organizationId, setlistId, itemId);
    const existing = await this.findAssignment(itemId, assignmentId);

    const parsed = updateAssignmentSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const updated = await this.assignmentsRepository.update(assignmentId, itemId, parsed.data.role ?? existing.role, parsed.data);
    return mapSetlistAssignment(updated);
  }

  async remove(userId: string, organizationId: string, setlistId: string, itemId: string, assignmentId: string) {
    await this.assertManage(userId, organizationId);
    await this.assertItemInSetlist(organizationId, setlistId, itemId);
    await this.findAssignment(itemId, assignmentId);

    await this.assignmentsRepository.delete(assignmentId);
    return { ok: true };
  }

  async updatePreparation(userId: string, organizationId: string, setlistId: string, itemId: string, assignmentId: string, body: Record<string, unknown>) {
    const membership = await this.permissions.assertOrganizationMember(userId, organizationId);
    await this.assertItemInSetlist(organizationId, setlistId, itemId);
    const existing = await this.findAssignment(itemId, assignmentId);

    const isOwnAssignment = existing.participant.membership.user.id === userId;
    const allowed = this.permissions.canUpdateOwnPreparationStatus(isOwnAssignment) || this.permissions.canUpdateAnyPreparationStatus(membership.role);
    if (!allowed) throw new ForbiddenException('No puedes actualizar el estado de preparacion de otro musico');

    const parsed = preparationSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const updated = await this.assignmentsRepository.updatePreparation(assignmentId, parsed.data.preparationStatus, parsed.data.preparationNote);
    return mapSetlistAssignment(updated);
  }

  async copy(userId: string, organizationId: string, setlistId: string, itemId: string, body: Record<string, unknown>) {
    await this.assertManage(userId, organizationId);
    await this.assertItemInSetlist(organizationId, setlistId, itemId);

    const parsed = copySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const source = await this.itemsRepository.findItem(setlistId, parsed.data.sourceItemId);
    if (!source) throw new BadRequestException('El item de origen no pertenece a este setlist');

    const copied = await this.assignmentsRepository.copy(parsed.data.sourceItemId, itemId, parsed.data.replaceExisting ?? false);
    return copied.map(mapSetlistAssignment);
  }

  async team(userId: string, organizationId: string, setlistId: string) {
    await this.assertView(userId, organizationId);
    await this.assertSetlistInOrg(organizationId, setlistId);

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

  private async assertView(userId: string, organizationId: string) {
    const membership = await this.permissions.assertOrganizationMember(userId, organizationId);
    if (!this.permissions.canViewSetlistAssignments(membership.role)) throw new ForbiddenException('No tienes permisos para ver el equipo del setlist');
    return membership;
  }

  private async assertManage(userId: string, organizationId: string) {
    const membership = await this.permissions.assertOrganizationMember(userId, organizationId);
    if (!this.permissions.canManageSetlistAssignments(membership.role)) throw new ForbiddenException('No tienes permisos para gestionar asignaciones');
    return membership;
  }

  private async assertSetlistInOrg(organizationId: string, setlistId: string) {
    const setlist = await this.setlistsRepository.findById(setlistId, organizationId);
    if (!setlist) throw new NotFoundException('Setlist no encontrado');
    return setlist;
  }

  private async assertItemInSetlist(organizationId: string, setlistId: string, itemId: string) {
    await this.assertSetlistInOrg(organizationId, setlistId);
    const item = await this.itemsRepository.findItem(setlistId, itemId);
    if (!item) throw new NotFoundException('Item no encontrado');
    return item;
  }
}
