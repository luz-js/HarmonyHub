import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { PermissionsService } from '../../permissions/permissions.service';
import { SetlistItemsRepository } from '../items/setlist-items.repository';
import { SetlistsRepository } from '../setlists.repository';
import { mapSetlistRoleRequirement } from './setlist-assignment.mapper';
import { SETLIST_MUSICAL_ROLES } from './setlist-assignment.utils';
import { SetlistRoleRequirementsRepository } from './setlist-role-requirements.repository';

const createRequirementSchema = z.object({
  role: z.enum(SETLIST_MUSICAL_ROLES),
  label: z.string().trim().max(120).optional().nullable(),
  minimumCount: z.coerce.number().int().min(1).max(20).optional(),
  isRequired: z.boolean().optional(),
});

const updateRequirementSchema = z.object({
  label: z.string().trim().max(120).optional().nullable(),
  minimumCount: z.coerce.number().int().min(1).max(20).optional(),
  isRequired: z.boolean().optional(),
});

@Injectable()
export class SetlistRoleRequirementsService {
  constructor(
    @Inject(SetlistRoleRequirementsRepository) private readonly requirementsRepository: SetlistRoleRequirementsRepository,
    @Inject(SetlistItemsRepository) private readonly itemsRepository: SetlistItemsRepository,
    @Inject(SetlistsRepository) private readonly setlistsRepository: SetlistsRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async list(userId: string, organizationId: string, setlistId: string, itemId: string) {
    await this.assertView(userId, organizationId);
    await this.assertItemInSetlist(organizationId, setlistId, itemId);
    const requirements = await this.requirementsRepository.listByItem(itemId);
    return requirements.map(mapSetlistRoleRequirement);
  }

  async create(userId: string, organizationId: string, setlistId: string, itemId: string, body: Record<string, unknown>) {
    await this.assertManage(userId, organizationId);
    await this.assertItemInSetlist(organizationId, setlistId, itemId);

    const parsed = createRequirementSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const existing = await this.requirementsRepository.findByRole(itemId, parsed.data.role);
    if (existing) throw new BadRequestException('Ya existe un requisito para este rol en este item');

    const created = await this.requirementsRepository.create({
      setlistItemId: itemId,
      role: parsed.data.role,
      label: parsed.data.label ?? null,
      minimumCount: parsed.data.minimumCount ?? 1,
      isRequired: parsed.data.isRequired ?? true,
    });
    return mapSetlistRoleRequirement(created);
  }

  async update(userId: string, organizationId: string, setlistId: string, itemId: string, requirementId: string, body: Record<string, unknown>) {
    await this.assertManage(userId, organizationId);
    await this.assertItemInSetlist(organizationId, setlistId, itemId);
    await this.findRequirement(itemId, requirementId);

    const parsed = updateRequirementSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const updated = await this.requirementsRepository.update(requirementId, parsed.data);
    return mapSetlistRoleRequirement(updated);
  }

  async remove(userId: string, organizationId: string, setlistId: string, itemId: string, requirementId: string) {
    await this.assertManage(userId, organizationId);
    await this.assertItemInSetlist(organizationId, setlistId, itemId);
    await this.findRequirement(itemId, requirementId);

    await this.requirementsRepository.delete(requirementId);
    return { ok: true };
  }

  private async findRequirement(itemId: string, requirementId: string) {
    const requirement = await this.requirementsRepository.findById(itemId, requirementId);
    if (!requirement) throw new NotFoundException('Requisito no encontrado');
    return requirement;
  }

  private async assertView(userId: string, organizationId: string) {
    const membership = await this.permissions.assertOrganizationMember(userId, organizationId);
    if (!this.permissions.canViewSetlistAssignments(membership.role)) throw new ForbiddenException('No tienes permisos para ver el equipo del setlist');
    return membership;
  }

  private async assertManage(userId: string, organizationId: string) {
    const membership = await this.permissions.assertOrganizationMember(userId, organizationId);
    if (!this.permissions.canManageSetlistRequirements(membership.role)) throw new ForbiddenException('No tienes permisos para gestionar requisitos');
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
