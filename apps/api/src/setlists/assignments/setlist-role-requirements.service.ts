import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateSetlistRoleRequirementData, UpdateSetlistRoleRequirementData } from '@harmonyhub/contracts';
import { SetlistsAccessService } from '../setlists-access.service';
import { mapSetlistRoleRequirement } from './setlist-assignment.mapper';
import { SetlistRoleRequirementsRepository } from './setlist-role-requirements.repository';
import type { OrgMember } from '../../permissions/current-membership.decorator';

@Injectable()
export class SetlistRoleRequirementsService {
  constructor(
    @Inject(SetlistRoleRequirementsRepository) private readonly requirementsRepository: SetlistRoleRequirementsRepository,
    @Inject(SetlistsAccessService) private readonly access: SetlistsAccessService,
  ) {}

  async list(member: OrgMember, setlistId: string, itemId: string) {
    const { organizationId } = member;
    await this.access.assertItemInSetlist(organizationId, setlistId, itemId);
    const requirements = await this.requirementsRepository.listByItem(itemId);
    return requirements.map(mapSetlistRoleRequirement);
  }

  async create(member: OrgMember, setlistId: string, itemId: string, data: CreateSetlistRoleRequirementData) {
    const { organizationId } = member;
    await this.access.assertItemInSetlist(organizationId, setlistId, itemId);

    const existing = await this.requirementsRepository.findByRole(itemId, data.role);
    if (existing) throw new BadRequestException('Ya existe un requisito para este rol en este item');

    const created = await this.requirementsRepository.create({
      setlistItemId: itemId,
      role: data.role,
      label: data.label ?? null,
      minimumCount: data.minimumCount ?? 1,
      isRequired: data.isRequired ?? true,
    });
    return mapSetlistRoleRequirement(created);
  }

  async update(member: OrgMember, setlistId: string, itemId: string, requirementId: string, data: UpdateSetlistRoleRequirementData) {
    const { organizationId } = member;
    await this.access.assertItemInSetlist(organizationId, setlistId, itemId);
    await this.findRequirement(itemId, requirementId);

    const updated = await this.requirementsRepository.update(requirementId, data);
    return mapSetlistRoleRequirement(updated);
  }

  async remove(member: OrgMember, setlistId: string, itemId: string, requirementId: string) {
    const { organizationId } = member;
    await this.access.assertItemInSetlist(organizationId, setlistId, itemId);
    await this.findRequirement(itemId, requirementId);

    await this.requirementsRepository.delete(requirementId);
    return { ok: true };
  }

  private async findRequirement(itemId: string, requirementId: string) {
    const requirement = await this.requirementsRepository.findById(itemId, requirementId);
    if (!requirement) throw new NotFoundException('Requisito no encontrado');
    return requirement;
  }
}
