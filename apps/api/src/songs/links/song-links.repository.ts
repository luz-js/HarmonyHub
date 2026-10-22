import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { sameTrackContext, linkOrderBy, linkInclude } from '../songs.queries';

/** Enlaces externos de una cancion (YouTube, Spotify...). */
@Injectable()
export class SongLinksRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listLinks(songId: string, options?: { versionId?: string | null }) {
    const versionId = options?.versionId;
    return this.prisma.songLink.findMany({
      where: {
        songId,
        ...(versionId === undefined
          ? {}
          : versionId === null
            ? { versionId: null }
            : { OR: [{ versionId: null }, { versionId }] }),
      },
      orderBy: linkOrderBy,
      include: linkInclude,
    });
  }

  findLink(songId: string, linkId: string) {
    return this.prisma.songLink.findFirst({ where: { id: linkId, songId }, include: linkInclude });
  }

  nextLinkSortOrder(songId: string, versionId: string | null) {
    return this.prisma.songLink.count({ where: { songId, ...sameTrackContext(versionId) } });
  }

  createLink(data: Prisma.SongLinkUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.songLink.updateMany({
          where: { songId: data.songId, ...sameTrackContext(data.versionId ?? null) },
          data: { isPrimary: false },
        });
      }
      return tx.songLink.create({ data, include: linkInclude });
    });
  }

  updateLink(linkId: string, data: Prisma.SongLinkUncheckedUpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.songLink.findUniqueOrThrow({ where: { id: linkId } });
      const nextVersionId = data.versionId === undefined ? link.versionId : (data.versionId as string | null);
      const nextIsPrimary = data.isPrimary === undefined ? link.isPrimary : Boolean(data.isPrimary);

      if (nextIsPrimary) {
        await tx.songLink.updateMany({
          where: { songId: link.songId, ...sameTrackContext(nextVersionId ?? null), NOT: { id: linkId } },
          data: { isPrimary: false },
        });
      }

      return tx.songLink.update({ where: { id: linkId }, data, include: linkInclude });
    });
  }

  deleteLink(linkId: string) {
    return this.prisma.songLink.delete({ where: { id: linkId } });
  }

  setLinkPrimary(songId: string, linkId: string) {
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.songLink.findFirst({ where: { id: linkId, songId }, select: { id: true, versionId: true } });
      if (!link) throw new NotFoundException('Enlace no encontrado');

      await tx.songLink.updateMany({
        where: { songId, ...sameTrackContext(link.versionId ?? null) },
        data: { isPrimary: false },
      });

      return tx.songLink.update({ where: { id: linkId }, data: { isPrimary: true }, include: linkInclude });
    });
  }

  reorderLinks(songId: string, versionId: string | null, items: Array<{ id: string; sortOrder: number }>) {
    return this.prisma.$transaction(async (tx) => {
      const links = await tx.songLink.findMany({
        where: { songId, ...sameTrackContext(versionId) },
        select: { id: true },
      });

      const linkIds = new Set(links.map((link) => link.id));
      if (items.some((item) => !linkIds.has(item.id))) {
        throw new BadRequestException('Uno o mas enlaces no pertenecen a este contexto');
      }

      const normalized = [...items].sort((a, b) => a.sortOrder - b.sortOrder).map((item, index) => ({ ...item, sortOrder: index }));
      await Promise.all(normalized.map((item) => tx.songLink.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })));

      return tx.songLink.findMany({
        where: { songId, ...sameTrackContext(versionId) },
        orderBy: linkOrderBy,
        include: linkInclude,
      });
    });
  }
}
