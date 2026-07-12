import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  createUser(data: { name: string; email: string; passwordHash: string }) {
    return this.prisma.user.create({
      data,
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: { organization: true },
        },
      },
    });
  }

  updatePasswordHash(id: string, passwordHash: string) {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: { organization: true },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
  }

  findUserForLogin(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            organization: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });
  }
}
