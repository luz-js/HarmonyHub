import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const noteOrderBy: Prisma.SongNoteOrderByWithRelationInput[] = [
  { isPinned: 'desc' },
  { createdAt: 'desc' },
];

const noteInclude = {
  version: { select: { id: true, name: true, key: true, isDefault: true } },
  author: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.SongNoteInclude;

@Injectable()
export class SongNotesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(songId: string, where: Prisma.SongNoteWhereInput) {
    return this.prisma.songNote.findMany({ where: { songId, ...where }, orderBy: noteOrderBy, include: noteInclude });
  }

  findById(songId: string, noteId: string) {
    return this.prisma.songNote.findFirst({ where: { id: noteId, songId }, include: noteInclude });
  }

  create(data: Prisma.SongNoteUncheckedCreateInput) {
    return this.prisma.songNote.create({ data, include: noteInclude });
  }

  update(noteId: string, data: Prisma.SongNoteUncheckedUpdateInput) {
    return this.prisma.songNote.update({ where: { id: noteId }, data, include: noteInclude });
  }

  delete(noteId: string) {
    return this.prisma.songNote.delete({ where: { id: noteId } });
  }

  async togglePin(noteId: string) {
    const note = await this.prisma.songNote.findUniqueOrThrow({ where: { id: noteId } });
    return this.prisma.songNote.update({ where: { id: noteId }, data: { isPinned: !note.isPinned }, include: noteInclude });
  }

  async toggleArchive(noteId: string) {
    const note = await this.prisma.songNote.findUniqueOrThrow({ where: { id: noteId } });
    return this.prisma.songNote.update({ where: { id: noteId }, data: { isArchived: !note.isArchived }, include: noteInclude });
  }
}
