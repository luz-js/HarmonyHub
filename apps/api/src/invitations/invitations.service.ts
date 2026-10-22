import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Invitation, InvitationStatus, MembershipRole, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';

const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const invitationCreateSchema = z.object({
  organizationId: z.string().min(1),
  email: z.string().trim().toLowerCase().email('Escribe un correo valido'),
  role: z.nativeEnum(MembershipRole).default('MUSICIAN'),
});

/** Lo que ve quien gestiona invitaciones. El token no se expone: aceptar depende del correo de quien entra. */
const invitationSelect = {
  id: true,
  organizationId: true,
  email: true,
  role: true,
  status: true,
  expiresAt: true,
  acceptedAt: true,
  createdAt: true,
  invitedBy: { select: { id: true, name: true } },
} satisfies Prisma.InvitationSelect;

/** "Mis invitaciones": lo que ve la persona invitada (con la organizacion; tampoco lleva token). */
const myInvitationSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  organization: { select: { id: true, name: true, slug: true } },
  invitedBy: { select: { id: true, name: true } },
} satisfies Prisma.InvitationSelect;

type Tx = Prisma.TransactionClient;
type InvitedUser = { id: string; email: string };

function sameEmail(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async list({ organizationId }: OrgMember) {
    return this.prisma.invitation.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, select: invitationSelect });
  }

  /** La organizacion viene en el cuerpo; PermissionsGuard ya verifico 'invitations.manage' sobre ella. */
  async create(member: OrgMember, body: unknown) {
    const parsed = invitationCreateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const { email, role } = parsed.data;
    const { organizationId } = member;

    // Misma regla que al cambiar un rol: solo un propietario nombra (o invita como) propietario.
    this.permissions.assertCanAssignMembershipRole(member.role, role);

    const activeMember = await this.prisma.membership.findFirst({
      where: { organizationId, status: 'ACTIVE', user: { email: { equals: email, mode: 'insensitive' } } },
    });
    if (activeMember) throw new ConflictException('Esa persona ya es miembro de la organizacion');

    const duplicated = new ConflictException('Ya hay una invitacion pendiente para ese correo');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const pending = await tx.invitation.findFirst({ where: { organizationId, email, status: 'PENDING' } });
        if (pending && pending.expiresAt > new Date()) throw duplicated;
        if (pending) await this.setStatus(tx, pending, 'EXPIRED');

        return tx.invitation.create({
          data: { organizationId, email, role, invitedById: member.userId, token: randomUUID(), expiresAt: new Date(Date.now() + INVITATION_TTL_MS) },
          select: invitationSelect,
        });
      });
    } catch (error) {
      // Dos invitaciones al mismo correo a la vez: la base rechaza la segunda por el unico (org, correo, PENDING).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw duplicated;
      throw error;
    }
  }

  /** Excepcion documentada: la organizacion sale de la invitacion, asi que el permiso se verifica aqui. */
  async cancel(userId: string, id: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id } });
    if (!invitation) throw new NotFoundException('Invitacion no encontrada');
    await this.permissions.assertPermission(userId, invitation.organizationId, 'invitations.manage');
    if (invitation.status !== 'PENDING') throw new BadRequestException('Solo se puede cancelar una invitacion pendiente');
    return this.prisma.$transaction((tx) => this.setStatus(tx, invitation, 'CANCELLED'));
  }

  async accept(token: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invitation) throw new NotFoundException('Invitacion no encontrada');
    const user = await this.findUser(userId);
    if (!sameEmail(user.email, invitation.email)) throw new ForbiddenException('Esta invitacion pertenece a otro correo');
    return this.acceptFor(invitation, user);
  }

  // --- "Mis invitaciones": siempre la persona de la sesion, buscando por el correo de su cuenta ---

  /** Pendientes y sin vencer, de cualquier organizacion, para el correo de quien inicio sesion. */
  async listMine(userId: string) {
    const user = await this.findUser(userId);
    return this.prisma.invitation.findMany({
      where: { email: { equals: user.email, mode: 'insensitive' }, status: 'PENDING', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: myInvitationSelect,
    });
  }

  /** Acepta una invitacion propia. Aceptar dos veces es seguro: la segunda solo confirma la membresia. */
  async acceptMine(userId: string, id: string) {
    const user = await this.findUser(userId);
    const invitation = await this.findMine(user, id);
    const result = await this.acceptFor(invitation, user);
    const membership = await this.prisma.membership.findUniqueOrThrow({
      where: { userId_organizationId: { userId, organizationId: invitation.organizationId } },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });
    return { invitation: result, organization: { ...membership.organization, role: membership.role } };
  }

  /** Rechaza una invitacion propia: queda como DECLINED (no se borra). Rechazar dos veces tambien es seguro. */
  async declineMine(userId: string, id: string) {
    const user = await this.findUser(userId);
    const invitation = await this.findMine(user, id);
    if (invitation.status === 'DECLINED') return this.prisma.invitation.findUniqueOrThrow({ where: { id }, select: invitationSelect });
    if (invitation.status !== 'PENDING') throw new BadRequestException('La invitacion ya no esta pendiente');
    return this.prisma.$transaction((tx) => this.setStatus(tx, invitation, 'DECLINED'));
  }

  private async findUser(userId: string): Promise<InvitedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /** Una invitacion de otro correo se responde igual que una que no existe: nunca se revela que existe. */
  private async findMine(user: InvitedUser, id: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id } });
    if (!invitation || !sameEmail(user.email, invitation.email)) throw new NotFoundException('Invitacion no encontrada');
    return invitation;
  }

  private async acceptFor(invitation: Invitation, user: InvitedUser) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: invitation.organizationId } },
    });
    if (invitation.status === 'ACCEPTED' && membership?.status === 'ACTIVE') {
      return this.prisma.invitation.findUniqueOrThrow({ where: { id: invitation.id }, select: invitationSelect });
    }
    if (invitation.status !== 'PENDING') throw new BadRequestException('La invitacion ya no esta pendiente');
    if (invitation.expiresAt < new Date()) throw new BadRequestException('La invitacion expiro');

    return this.prisma.$transaction(async (tx) => {
      // Si ya es miembro activo (p. ej. entro por otra invitacion) no se le cambia el rol que tiene.
      if (!membership) {
        await tx.membership.create({ data: { userId: user.id, organizationId: invitation.organizationId, role: invitation.role, status: 'ACTIVE' } });
      } else if (membership.status !== 'ACTIVE') {
        await tx.membership.update({ where: { id: membership.id }, data: { role: invitation.role, status: 'ACTIVE' } });
      }
      return this.setStatus(tx, invitation, 'ACCEPTED');
    });
  }

  /**
   * La tabla tiene un unico por (organizacion, correo, estado): para pasar una invitacion a CANCELLED, EXPIRED o
   * ACCEPTED se borra antes la anterior de ese mismo correo con ese estado (si no, la segunda vez daba error 500).
   */
  private async setStatus(tx: Tx, invitation: { id: string; organizationId: string; email: string }, status: InvitationStatus) {
    await tx.invitation.deleteMany({ where: { organizationId: invitation.organizationId, email: invitation.email, status, id: { not: invitation.id } } });
    return tx.invitation.update({
      where: { id: invitation.id },
      data: { status, ...(status === 'ACCEPTED' ? { acceptedAt: new Date() } : {}) },
      select: invitationSelect,
    });
  }
}
