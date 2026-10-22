import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';

const invitationCreateSchema = z.object({
  organizationId: z.string().min(1),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  role: z.nativeEnum(MembershipRole).default('MUSICIAN'),
});

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async list({ organizationId }: OrgMember) {
    return this.prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** La organizacion viene en el cuerpo; PermissionsGuard ya verifico 'invitations.manage' sobre ella. */
  async create({ userId, organizationId }: OrgMember, body: unknown) {
    const parsed = invitationCreateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const { email, role } = parsed.data;

    return this.prisma.invitation.create({
      data: {
        organizationId,
        email,
        role,
        invitedById: userId,
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });
  }

  /** Excepcion documentada: la organizacion sale de la invitacion, asi que el permiso se verifica aqui. */
  async cancel(userId: string, id: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id } });
    if (!invitation) throw new NotFoundException('Invitacion no encontrada');
    await this.permissions.assertPermission(userId, invitation.organizationId, 'invitations.manage');
    return this.prisma.invitation.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async accept(token: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invitation) throw new NotFoundException('Invitacion no encontrada');
    if (invitation.status !== 'PENDING') throw new BadRequestException('La invitacion ya no esta pendiente');
    if (invitation.expiresAt < new Date()) throw new BadRequestException('La invitacion expiro');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException('Esta invitacion pertenece a otro correo');
    }

    await this.prisma.membership.upsert({
      where: { userId_organizationId: { userId, organizationId: invitation.organizationId } },
      update: { role: invitation.role, status: 'ACTIVE' },
      create: { userId, organizationId: invitation.organizationId, role: invitation.role, status: 'ACTIVE' },
    });

    return this.prisma.invitation.update({
      where: { token },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });
  }
}
