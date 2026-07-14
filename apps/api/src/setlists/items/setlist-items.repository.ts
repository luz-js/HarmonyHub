import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const itemDetailInclude = {
  song: { select: { id: true, title: true, artist: true, coverUrl: true } },
  songVersion: { select: { id: true, name: true, key: true, bpm: true, durationSec: true, isDefault: true } },
} satisfies Prisma.SetlistItemInclude;

@Injectable()
export class SetlistItemsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listItems(setlistId: string) {
    return this.prisma.setlistItem.findMany({ where: { setlistId }, orderBy: { order: 'asc' }, include: itemDetailInclude });
  }

  findItem(setlistId: string, itemId: string) {
    return this.prisma.setlistItem.findFirst({ where: { id: itemId, setlistId }, include: itemDetailInclude });
  }

  countItems(setlistId: string) {
    return this.prisma.setlistItem.count({ where: { setlistId } });
  }

  createItem(data: Prisma.SetlistItemUncheckedCreateInput) {
    return this.prisma.setlistItem.create({ data, include: itemDetailInclude });
  }

  updateItem(id: string, data: Prisma.SetlistItemUncheckedUpdateInput) {
    return this.prisma.setlistItem.update({ where: { id }, data, include: itemDetailInclude });
  }

  findSongForValidation(songId: string, organizationId: string) {
    return this.prisma.song.findFirst({
      where: { id: songId, organizationId },
      select: { id: true, title: true, artist: true, coverUrl: true, status: true },
    });
  }

  findVersionForValidation(songId: string, versionId: string) {
    return this.prisma.songVersion.findFirst({
      where: { id: versionId, songId },
      select: { id: true, songId: true, name: true, key: true, bpm: true, durationSec: true, isDefault: true },
    });
  }

  /**
   * Renumera 0..n-1 en el orden exacto de `orderedIds` usando dos pasadas
   * (offset temporal + valores finales) para nunca chocar con la restriccion
   * unica (setlistId, order): Postgres no garantiza que un UPDATE que desplace
   * varias filas a la vez respete el orden logico fila a fila.
   */
  private async applyOrder(tx: Prisma.TransactionClient, orderedIds: string[]) {
    const tempOffset = orderedIds.length + 1000;
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.setlistItem.update({ where: { id: orderedIds[i] }, data: { order: tempOffset + i } });
    }
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.setlistItem.update({ where: { id: orderedIds[i] }, data: { order: i } });
    }
  }

  reorder(setlistId: string, itemIds: string[]) {
    return this.prisma.$transaction((tx) => this.applyOrder(tx, itemIds));
  }

  deleteAndNormalize(setlistId: string, itemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.setlistItem.findFirst({ where: { id: itemId, setlistId } });
      if (!existing) throw new NotFoundException('Item no encontrado');
      await tx.setlistItem.delete({ where: { id: itemId } });
      const remaining = await tx.setlistItem.findMany({ where: { setlistId }, orderBy: { order: 'asc' }, select: { id: true } });
      await this.applyOrder(tx, remaining.map((item) => item.id));
    });
  }

  duplicate(setlistId: string, sourceItemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const source = await tx.setlistItem.findFirst({ where: { id: sourceItemId, setlistId } });
      if (!source) throw new NotFoundException('Item no encontrado');

      const { id, createdAt, updatedAt, order, ...rest } = source;
      const tempOrder = await tx.setlistItem.count({ where: { setlistId } });
      const created = await tx.setlistItem.create({ data: { ...rest, setlistId, order: tempOrder }, include: itemDetailInclude });

      const all = await tx.setlistItem.findMany({ where: { setlistId }, orderBy: { order: 'asc' }, select: { id: true } });
      const withoutNew = all.filter((item) => item.id !== created.id);
      const insertIndex = withoutNew.findIndex((item) => item.id === sourceItemId) + 1;
      withoutNew.splice(insertIndex, 0, { id: created.id });
      await this.applyOrder(tx, withoutNew.map((item) => item.id));

      return created;
    });
  }
}
