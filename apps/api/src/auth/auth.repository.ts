import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Lo que viaja en la sesion: membresias activas y lo que la persona sabe tocar (el principal primero). */
const sessionUserInclude = {
  memberships: {
    where: { status: 'ACTIVE' },
    include: { organization: true },
    orderBy: { joinedAt: 'asc' },
  },
  instruments: {
    select: { id: true, instrument: true, isPrimary: true, createdAt: true },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.UserInclude;

@Injectable()
export class AuthRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  createUser(data: { name: string; email: string; passwordHash: string }) {
    return this.prisma.user.create({ data, include: sessionUserInclude });
  }

  updatePasswordHash(id: string, passwordHash: string) {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: sessionUserInclude });
  }

  findUserForLogin(email: string) {
    return this.prisma.user.findUnique({ where: { email }, include: sessionUserInclude });
  }
}
