import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
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

  async list(userId: string, organizationId: string) {
    await this.permissions.assertPermission(userId, organizationId, 'invitations.manage');
    return this.prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, body: unknown) {
    const parsed = invitationCreateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const { organizationId, email, role } = parsed.data;

    await this.permissions.assertPermission(userId, organizationId, 'invitations.manage');

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
