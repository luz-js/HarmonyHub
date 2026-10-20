import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, Prisma, SongNoteVisibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Permission = 'organization.manage' | 'members.manage' | 'invitations.manage' | 'songs.manage' | 'events.manage' | 'setlists.manage' | 'read';

const permissionsByRole: Record<MembershipRole, Permission[]> = {
  OWNER: ['organization.manage', 'members.manage', 'invitations.manage', 'songs.manage', 'events.manage', 'setlists.manage', 'read'],
  ADMIN: ['organization.manage', 'members.manage', 'invitations.manage', 'songs.manage', 'events.manage', 'setlists.manage', 'read'],
  LEADER: ['songs.manage', 'events.manage', 'setlists.manage', 'read'],
  MUSICIAN: ['read'],
  GUEST: ['read'],
};

@Injectable()
export class PermissionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  can(role: MembershipRole, permission: Permission) {
    return permissionsByRole[role]?.includes(permission) || false;
  }

  canManageOrganization(role: MembershipRole) {
    return this.can(role, 'organization.manage');
  }

  canManageMembers(role: MembershipRole) {
    return this.can(role, 'members.manage');
  }

  canInviteMembers(role: MembershipRole) {
    return this.can(role, 'invitations.manage');
  }

  canManageSongs(role: MembershipRole) {
    return this.can(role, 'songs.manage');
  }

  canManageEvents(role: MembershipRole) {
    return this.can(role, 'events.manage');
  }

  canManageSetlists(role: MembershipRole) {
    return this.can(role, 'setlists.manage');
  }

  canViewOrganization(role: MembershipRole) {
    return this.can(role, 'read');
  }

  // --- Notas y colaboracion (SongNote / SongCommentThread / SongComment) ---
  // Centralizado aqui para no repetir comparaciones de rol en cada controller.

  /** OWNER/ADMIN/LEADER: unico conjunto de roles con visibilidad/gestion "de liderazgo" (LEADERS_ONLY, threads). */
  isLeadershipRole(role: MembershipRole) {
    return role === 'OWNER' || role === 'ADMIN' || role === 'LEADER';
  }

  canCreateSongNoteVisibility(role: MembershipRole, visibility: SongNoteVisibility) {
    if (visibility === 'LEADERS_ONLY') return this.isLeadershipRole(role);
    if (visibility === 'ORGANIZATION' || visibility === 'PRIVATE') return role !== 'GUEST';
    return false;
  }

  /** Filtro Prisma que garantiza que un usuario nunca reciba PRIVATE ajenas ni LEADERS_ONLY fuera de su rol. */
  buildVisibleSongNoteWhere(userId: string, role: MembershipRole): Prisma.SongNoteWhereInput {
    const conditions: Prisma.SongNoteWhereInput[] = [
      { visibility: 'ORGANIZATION' },
      { visibility: 'PRIVATE', authorId: userId },
    ];
    if (this.isLeadershipRole(role)) conditions.push({ visibility: 'LEADERS_ONLY' });
    return { OR: conditions };
  }

  /** Autor siempre puede modificar la suya; PRIVATE de otros nunca; compartidas (ORGANIZATION/LEADERS_ONLY) solo OWNER/ADMIN ademas del autor. */
  canModifySongNote(role: MembershipRole, note: { authorId: string; visibility: SongNoteVisibility }, userId: string) {
    if (note.authorId === userId) return true;
    if (note.visibility === 'PRIVATE') return false;
    return role === 'OWNER' || role === 'ADMIN';
  }

  canResolveSongThread(role: MembershipRole, isCreator: boolean) {
    return this.isLeadershipRole(role) || isCreator;
  }

  canModerateSongComment(role: MembershipRole) {
    return role === 'OWNER' || role === 'ADMIN';
  }

  // --- Setlists (Setlist / SetlistItem) ---
  // Centralizado aqui para no repetir comparaciones de rol en cada controller.

  canViewSetlists(role: MembershipRole) {
    return this.can(role, 'read');
  }

  canPublishSetlists(role: MembershipRole) {
    return this.isLeadershipRole(role);
  }

  canArchiveSetlists(role: MembershipRole) {
    return this.isLeadershipRole(role);
  }

  canDeleteSetlists(role: MembershipRole) {
    return role === 'OWNER' || role === 'ADMIN';
  }

  // --- Asignaciones musicales (SetlistParticipant / SetlistAssignment / SetlistRoleRequirement) ---
  // Centralizado aqui para no repetir comparaciones de rol en cada controller.

  canViewSetlistAssignments(role: MembershipRole) {
    return this.can(role, 'read');
  }

  canManageSetlistParticipants(role: MembershipRole) {
    return this.isLeadershipRole(role);
  }

  canManageSetlistAssignments(role: MembershipRole) {
    return this.isLeadershipRole(role);
  }

  canManageSetlistRequirements(role: MembershipRole) {
    return this.isLeadershipRole(role);
  }

  /** Cualquier rol puede actualizar su propio estado de preparacion si la asignacion es suya. */
  canUpdateOwnPreparationStatus(isAssignee: boolean) {
    return isAssignee;
  }

  canUpdateAnyPreparationStatus(role: MembershipRole) {
    return this.isLeadershipRole(role);
  }

  // --- Cues y produccion (SetlistCue) ---

  canViewSetlistCues(role: MembershipRole) {
    return this.can(role, 'read');
  }

  canManageSetlistCues(role: MembershipRole) {
    return this.isLeadershipRole(role);
  }

  /** Cualquier rol puede actualizar el status de un cue si es su responsable. */
  canUpdateOwnCueStatus(isResponsible: boolean) {
    return isResponsible;
  }

  canUpdateAnyCueStatus(role: MembershipRole) {
    return this.isLeadershipRole(role);
  }

  // --- Eventos (Event / EventMusician) ---

  canViewEvents(role: MembershipRole) {
    return this.can(role, 'read');
  }

  canDeleteEvents(role: MembershipRole) {
    return role === 'OWNER' || role === 'ADMIN';
  }

  /** El propio musico confirma o rechaza su asistencia; los lideres pueden ajustar la de cualquiera. */
  canUpdateEventAttendance(role: MembershipRole, isSelf: boolean) {
    return isSelf || this.can(role, 'events.manage');
  }

  async getMembership(userId: string, organizationId: string) {
    if (!organizationId) throw new BadRequestException('Organizacion activa requerida');
    return this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { user: true, organization: true },
    });
  }

  async assertOrganizationMember(userId: string, organizationId: string) {
    const membership = await this.getMembership(userId, organizationId);
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException('No tienes acceso a esta organizacion');
    }
    return membership;
  }

  async assertRole(userId: string, organizationId: string, allowedRoles: MembershipRole[]) {
    const membership = await this.assertOrganizationMember(userId, organizationId);
    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Permisos insuficientes');
    }
    return membership;
  }

  async assertPermission(userId: string, organizationId: string, permission: Permission) {
    const membership = await this.assertOrganizationMember(userId, organizationId);
    if (!this.can(membership.role, permission)) {
      throw new ForbiddenException('Permisos insuficientes');
    }
    return membership;
  }

  async getMembershipById(id: string) {
    const membership = await this.prisma.membership.findUnique({ where: { id }, include: { user: true } });
    if (!membership) throw new NotFoundException('Miembro no encontrado');
    return membership;
  }

  async assertCanMutateMembership(actorUserId: string, targetMembershipId: string) {
    const target = await this.getMembershipById(targetMembershipId);
    const actor = await this.assertPermission(actorUserId, target.organizationId, 'members.manage');

    if (actor.role === 'ADMIN' && target.role === 'OWNER') {
      throw new ForbiddenException('Un ADMIN no puede modificar un OWNER');
    }

    return { actor, target };
  }

  async assertNotLastOwner(organizationId: string, targetMembershipId: string) {
    const target = await this.getMembershipById(targetMembershipId);
    if (target.role !== 'OWNER' || target.status !== 'ACTIVE') return;

    const owners = await this.prisma.membership.count({
      where: { organizationId, role: 'OWNER', status: 'ACTIVE', id: { not: targetMembershipId } },
    });

    if (owners === 0) {
      throw new ForbiddenException('No se puede quitar el ultimo OWNER');
    }
  }
}
