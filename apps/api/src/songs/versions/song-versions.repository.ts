import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Versiones de una cancion (tonalidad, letra y acordes de cada arreglo). */
@Injectable()
export class SongVersionsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listVersions(songId: string) {
    return this.prisma.songVersion.findMany({
      where: { songId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  createVersion(data: Prisma.SongVersionUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.songVersion.count({ where: { songId: data.songId } });
      const shouldBeDefault = data.isDefault || count === 0;
      if (shouldBeDefault) await tx.songVersion.updateMany({ where: { songId: data.songId }, data: { isDefault: false } });
      return tx.songVersion.create({ data: { ...data, isDefault: shouldBeDefault } });
    });
  }

  updateVersion(versionId: string, data: Prisma.SongVersionUpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault === true) {
        const version = await tx.songVersion.findUniqueOrThrow({ where: { id: versionId } });
        await tx.songVersion.updateMany({ where: { songId: version.songId }, data: { isDefault: false } });
      }
      return tx.songVersion.update({ where: { id: versionId }, data });
    });
  }

  setDefaultVersion(songId: string, versionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const version = await tx.songVersion.findFirst({ where: { id: versionId, songId } });
      if (!version) throw new NotFoundException('Version no encontrada');
      await tx.songVersion.updateMany({ where: { songId }, data: { isDefault: false } });
      return tx.songVersion.update({ where: { id: versionId }, data: { isDefault: true } });
    });
  }

  deleteVersion(songId: string, versionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const versions = await tx.songVersion.findMany({ where: { songId }, orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] });
      const target = versions.find((version) => version.id === versionId);
      if (!target) throw new NotFoundException('Version no encontrada');
      if (versions.length <= 1) throw new BadRequestException('No se puede eliminar la ultima version de una cancion');
      await tx.songVersion.delete({ where: { id: versionId } });
      if (target.isDefault) {
        const nextDefault = versions.find((version) => version.id !== versionId);
        if (nextDefault) await tx.songVersion.update({ where: { id: nextDefault.id }, data: { isDefault: true } });
      }
      return { ok: true };
    });
  }
}
