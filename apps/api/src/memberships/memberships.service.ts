import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { MembershipRole, MembershipStatus } from '@prisma/client';
import { z } from 'zod';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';

const membershipUpdateSchema = z.object({
  role: z.nativeEnum(MembershipRole).optional(),
  status: z.nativeEnum(MembershipStatus).optional(),
  instrument: z.string().optional().nullable(),
});

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async list(userId: string, organizationId: string) {
    await this.permissions.assertOrganizationMember(userId, organizationId);
    return this.prisma.membership.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true, active: true, createdAt: true } } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
  }

  async update(userId: string, id: string, body: unknown) {
    const parsed = membershipUpdateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const { target } = await this.permissions.assertCanMutateMembership(userId, id);
    if (parsed.data.role && parsed.data.role !== target.role) {
      await this.permissions.assertNotLastOwner(target.organizationId, id);
    }
    if (parsed.data.status && parsed.data.status !== 'ACTIVE') {
      await this.permissions.assertNotLastOwner(target.organizationId, id);
    }

    return this.prisma.membership.update({
      where: { id },
      data: {
        role: parsed.data.role,
        status: parsed.data.status,
        instrument: parsed.data.instrument,
      },
    });
  }
}
