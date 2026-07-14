import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const actorSelect = { id: true, name: true, avatarUrl: true } satisfies Prisma.UserSelect;

@Injectable()
export class SongActivityRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  create(data: Prisma.SongActivityUncheckedCreateInput, client: Prisma.TransactionClient = this.prisma) {
    return client.songActivity.create({ data });
  }

  async list(songId: string, where: Prisma.SongActivityWhereInput, skip: number, take: number) {
    const [items, total] = await Promise.all([
      this.prisma.songActivity.findMany({
        where: { songId, ...where },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          actor: { select: actorSelect },
          version: { select: { id: true, name: true } },
        },
      }),
      this.prisma.songActivity.count({ where: { songId, ...where } }),
    ]);
    return { items, total };
  }
}
