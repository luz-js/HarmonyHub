import { Inject, Injectable } from '@nestjs/common';
import type { SetlistMusicalRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const profileSelect = { id: true, name: true, email: true, phone: true, avatarUrl: true } as const;
const instrumentSelect = { id: true, instrument: true, isPrimary: true, createdAt: true } as const;

@Injectable()
export class ProfileRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  updateUser(userId: string, data: { name?: string; phone?: string | null }) {
    return this.prisma.user.update({ where: { id: userId }, data, select: profileSelect });
  }

  findActiveMembership(userId: string, organizationId: string) {
    return this.prisma.membership.findFirst({ where: { userId, organizationId, status: 'ACTIVE' }, select: { id: true } });
  }

  setActiveOrganization(userId: string, organizationId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { activeOrganizationId: organizationId }, select: { activeOrganizationId: true } });
  }

  /** Borra y vuelve a crear la lista dentro de una transaccion: nunca queda a medias. */
  replaceInstruments(userId: string, instruments: { instrument: SetlistMusicalRole; isPrimary: boolean }[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.userInstrument.deleteMany({ where: { userId } });
      if (instruments.length > 0) {
        await tx.userInstrument.createMany({ data: instruments.map((item) => ({ userId, ...item })) });
      }
      return tx.userInstrument.findMany({ where: { userId }, select: instrumentSelect, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] });
    });
  }
}
