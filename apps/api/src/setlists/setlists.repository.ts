import { Inject, Injectable } from '@nestjs/common';
import { Prisma, SetlistStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calculateSetlistEstimatedSec } from './setlist.utils';

const summaryInclude = {
  createdBy: { select: { id: true, name: true } },
  items: { select: { type: true } },
} satisfies Prisma.SetlistInclude;

const itemDetailInclude = {
  song: { select: { id: true, title: true, artist: true, coverUrl: true } },
  songVersion: { select: { id: true, name: true, key: true, bpm: true, durationSec: true, isDefault: true } },
} satisfies Prisma.SetlistItemInclude;

@Injectable()
export class SetlistsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(organizationId: string, filters: { status?: SetlistStatus; search?: string; includeArchived?: boolean; skip: number; take: number }) {
    const where: Prisma.SetlistWhereInput = {
      organizationId,
      status: filters.status || (filters.includeArchived ? undefined : { not: 'ARCHIVED' }),
      ...(filters.search ? { name: { contains: filters.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.setlist.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: filters.skip,
        take: filters.take,
        include: summaryInclude,
      }),
      this.prisma.setlist.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string, organizationId: string) {
    return this.prisma.setlist.findFirst({ where: { id, organizationId } });
  }

  findDetail(id: string, organizationId: string) {
    return this.prisma.setlist.findFirst({
      where: { id, organizationId },
      include: {
        items: { orderBy: { order: 'asc' }, include: itemDetailInclude },
      },
    });
  }

  create(data: Prisma.SetlistUncheckedCreateInput) {
    return this.prisma.setlist.create({ data });
  }

  update(id: string, data: Prisma.SetlistUncheckedUpdateInput) {
    return this.prisma.setlist.update({ where: { id }, data });
  }

  countEvents(setlistId: string) {
    return this.prisma.event.count({ where: { setlistId } });
  }

  delete(id: string) {
    return this.prisma.setlist.delete({ where: { id } });
  }

  async recalculateStats(setlistId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const items = await client.setlistItem.findMany({
      where: { setlistId },
      select: { isHidden: true, durationOverrideSec: true, estimatedSec: true, songVersion: { select: { durationSec: true } } },
    });
    return client.setlist.update({
      where: { id: setlistId },
      data: { itemCount: items.length, estimatedSec: calculateSetlistEstimatedSec(items) },
    });
  }
}
