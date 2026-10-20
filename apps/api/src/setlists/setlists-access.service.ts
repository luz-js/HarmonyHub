import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { PermissionsService } from '../permissions/permissions.service';
import { SetlistItemsRepository } from './items/setlist-items.repository';
import { SetlistsRepository } from './setlists.repository';

@Injectable()
export class SetlistsAccessService {
  constructor(
    @Inject(SetlistsRepository) private readonly setlistsRepository: SetlistsRepository,
    @Inject(SetlistItemsRepository) private readonly itemsRepository: SetlistItemsRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async assertViewSetlists(userId: string, organizationId: string) {
    return this.assertRole(userId, organizationId, (role) => this.permissions.canViewSetlists(role), 'No tienes permisos para ver setlists');
  }

  async assertManageSetlists(userId: string, organizationId: string) {
    return this.assertRole(userId, organizationId, (role) => this.permissions.canManageSetlists(role), 'No tienes permisos para gestionar setlists');
  }

  async assertArchiveSetlists(userId: string, organizationId: string) {
    return this.assertRole(userId, organizationId, (role) => this.permissions.canArchiveSetlists(role), 'No tienes permisos para archivar setlists');
  }

  async assertPublishSetlists(userId: string, organizationId: string) {
    return this.assertRole(userId, organizationId, (role) => this.permissions.canPublishSetlists(role), 'No tienes permisos para publicar setlists');
  }

  async assertDeleteSetlists(userId: string, organizationId: string) {
    return this.assertRole(userId, organizationId, (role) => this.permissions.canDeleteSetlists(role), 'No tienes permisos para eliminar setlists');
  }

  async assertViewAssignments(userId: string, organizationId: string) {
    return this.assertRole(userId, organizationId, (role) => this.permissions.canViewSetlistAssignments(role), 'No tienes permisos para ver el equipo del setlist');
  }

  async assertManageParticipants(userId: string, organizationId: string) {
    return this.assertRole(userId, organizationId, (role) => this.permissions.canManageSetlistParticipants(role), 'No tienes permisos para gestionar participantes');
  }

  async assertManageAssignments(userId: string, organizationId: string) {
    return this.assertRole(userId, organizationId, (role) => this.permissions.canManageSetlistAssignments(role), 'No tienes permisos para gestionar asignaciones');
  }

  async assertManageRequirements(userId: string, organizationId: string) {
    return this.assertRole(userId, organizationId, (role) => this.permissions.canManageSetlistRequirements(role), 'No tienes permisos para gestionar requisitos');
  }

  async assertViewCues(userId: string, organizationId: string) {
    return this.assertRole(userId, organizationId, (role) => this.permissions.canViewSetlistCues(role), 'No tienes permisos para ver la produccion del setlist');
  }

  async assertManageCues(userId: string, organizationId: string) {
    return this.assertRole(userId, organizationId, (role) => this.permissions.canManageSetlistCues(role), 'No tienes permisos para gestionar cues');
  }

  async assertSetlistInOrg(organizationId: string, setlistId: string) {
    const setlist = await this.setlistsRepository.findById(setlistId, organizationId);
    if (!setlist) throw new NotFoundException('Setlist no encontrado');
    return setlist;
  }

  async assertItemInSetlist(organizationId: string, setlistId: string, itemId: string) {
    await this.assertSetlistInOrg(organizationId, setlistId);
    const item = await this.itemsRepository.findItem(setlistId, itemId);
    if (!item) throw new NotFoundException('Item no encontrado');
    return item;
  }

  private async assertRole(
    userId: string,
    organizationId: string,
    canAccess: (role: MembershipRole) => boolean,
    message: string,
  ) {
    const membership = await this.permissions.assertOrganizationMember(userId, organizationId);
    if (!canAccess(membership.role)) throw new ForbiddenException(message);
    return membership;
  }
}
