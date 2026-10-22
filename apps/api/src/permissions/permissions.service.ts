import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, Prisma, SongNoteVisibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Permission, PERMISSION_DENIED_MESSAGE, roleCan } from './permission-table';

export type { Permission } from './permission-table';

/**
 * Los permisos por rol viven en permission-table.ts y los verifica PermissionsGuard en cada ruta.
 * Aqui quedan la consulta de la membresia y las reglas que dependen del dato (autor, asignado, propietario...).
 */
@Injectable()
export class PermissionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  can(role: MembershipRole, permission: Permission) {
    return roleCan(role, permission);
  }

  /** Para cuando el permiso depende del dato (p. ej. cambiar el estado a PUBLISHED exige 'setlists.publish'). */
  assertRoleCan(role: MembershipRole, permission: Permission) {
    if (!this.can(role, permission)) throw new ForbiddenException(PERMISSION_DENIED_MESSAGE);
  }

  // --- Notas y colaboracion (SongNote / SongCommentThread / SongComment) ---

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

  // --- Asignaciones y cues: lo propio o, si no, rol de liderazgo ---

  /** Cualquier rol puede actualizar su propio estado de preparacion si la asignacion es suya. */
  canUpdateOwnPreparationStatus(isAssignee: boolean) {
    return isAssignee;
  }

  canUpdateAnyPreparationStatus(role: MembershipRole) {
    return this.isLeadershipRole(role);
  }

  /** Cualquier rol puede actualizar el status de un cue si es su responsable. */
  canUpdateOwnCueStatus(isResponsible: boolean) {
    return isResponsible;
  }

  canUpdateAnyCueStatus(role: MembershipRole) {
    return this.isLeadershipRole(role);
  }

  // --- Eventos (EventMusician) ---

  /** El propio musico confirma o rechaza su asistencia; los lideres pueden ajustar la de cualquiera. */
  canUpdateEventAttendance(role: MembershipRole, isSelf: boolean) {
    return isSelf || this.can(role, 'events.manage');
  }

  // --- Membresia ---

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

  /** Lo usa PermissionsGuard; los servicios solo lo llaman cuando la organizacion sale del dato (excepciones documentadas). */
  async assertPermission(userId: string, organizationId: string, permission: Permission) {
    const membership = await this.assertOrganizationMember(userId, organizationId);
    if (!this.can(membership.role, permission)) {
      throw new ForbiddenException(PERMISSION_DENIED_MESSAGE);
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

  /** Solo un OWNER puede nombrar a otro OWNER (un ADMIN no puede ascender a nadie, ni a si mismo, a propietario). */
  canAssignMembershipRole(actorRole: MembershipRole, nextRole: MembershipRole) {
    return nextRole !== 'OWNER' || actorRole === 'OWNER';
  }

  assertCanAssignMembershipRole(actorRole: MembershipRole, nextRole: MembershipRole) {
    if (!this.canAssignMembershipRole(actorRole, nextRole)) {
      throw new ForbiddenException('Solo un propietario puede nombrar a otro propietario');
    }
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
