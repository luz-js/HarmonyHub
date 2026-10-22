import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { MembershipRole, MembershipStatus } from '@prisma/client';
import { z } from 'zod';
import type { OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { repointActiveOrganization } from '../shared/active-organization';
import { userInstrumentsSelect } from '../shared/user-instruments';

// El instrumento ya no vive en la membresia: lo elige cada persona en "Mi perfil" (UserInstrument).
const membershipUpdateSchema = z.object({
  role: z.nativeEnum(MembershipRole).optional(),
  status: z.nativeEnum(MembershipStatus).optional(),
});

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async list({ organizationId }: OrgMember) {
    return this.prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true, active: true, createdAt: true, instruments: userInstrumentsSelect },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
  }

  async update(userId: string, id: string, body: unknown) {
    const parsed = membershipUpdateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const { actor, target } = await this.permissions.assertCanMutateMembership(userId, id);
    if (parsed.data.role && parsed.data.role !== target.role) {
      this.permissions.assertCanAssignMembershipRole(actor.role, parsed.data.role);
      await this.permissions.assertNotLastOwner(target.organizationId, id);
    }
    if (parsed.data.status && parsed.data.status !== 'ACTIVE') {
      await this.permissions.assertNotLastOwner(target.organizationId, id);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.membership.update({
        where: { id },
        data: {
          role: parsed.data.role,
          status: parsed.data.status,
        },
      });
      // Si la desactivan y esa era su organizacion activa guardada, se le cambia por otra (o queda vacia).
      if (updated.status !== 'ACTIVE') await repointActiveOrganization(tx, updated.userId, updated.organizationId);
      return updated;
    });
  }
}
