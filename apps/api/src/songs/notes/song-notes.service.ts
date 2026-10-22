import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { updateSongNoteSchema, type CreateSongNoteData, type SongNoteListQueryData } from '@harmonyhub/contracts';
import { parseOrBadRequest } from '../../shared/zod.pipe';
import { MembershipRole, Prisma, SongNoteVisibility } from '@prisma/client';
import { PermissionsService } from '../../permissions/permissions.service';
import { clean } from '../../shared/object.utils';
import { SongActivityService } from '../activity/song-activity.service';
import { assertSongAccess, assertSongVersionAccess } from '../song-access.utils';
import { SongsRepository } from '../songs.repository';
import { SongNotesRepository } from './song-notes.repository';
import type { OrgMember } from '../../permissions/current-membership.decorator';

type NoteRecord = {
  id: string;
  songId: string;
  versionId: string | null;
  authorId: string;
  title: string | null;
  content: string;
  visibility: SongNoteVisibility;
  isPinned: boolean;
  isArchived: boolean;
  version?: { id: string; name: string; key: string; isDefault: boolean } | null;
  author?: { id: string; name: string; avatarUrl: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeNote(note: NoteRecord) {
  return {
    id: note.id,
    songId: note.songId,
    versionId: note.versionId,
    title: note.title,
    content: note.content,
    visibility: note.visibility,
    isPinned: note.isPinned,
    isArchived: note.isArchived,
    version: note.version ?? null,
    author: note.author ?? null,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

@Injectable()
export class SongNotesService {
  constructor(
    @Inject(SongsRepository) private readonly songsRepository: SongsRepository,
    @Inject(SongNotesRepository) private readonly notesRepository: SongNotesRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
    @Inject(SongActivityService) private readonly activity: SongActivityService,
  ) {}

  private async assertNoteInSong(songId: string, noteId: string) {
    const note = await this.notesRepository.findById(songId, noteId);
    if (!note) throw new NotFoundException('Nota no encontrada');
    return note as NoteRecord;
  }

  /** Las notas PRIVATE nunca generan actividad visible para otros (puede omitirse completamente). */
  private recordNoteActivityBestEffort(note: NoteRecord, params: { organizationId: string; actorId: string; action: 'NOTE_CREATED' | 'NOTE_UPDATED' | 'NOTE_ARCHIVED' | 'NOTE_DELETED' | 'NOTE_PINNED'; summary: string }) {
    if (note.visibility === 'PRIVATE') return Promise.resolve();
    return this.activity.recordBestEffort({
      songId: note.songId,
      versionId: note.versionId,
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: params.action,
      entityType: 'NOTE',
      entityId: note.id,
      summary: params.summary,
    });
  }

  /** PRIVATE de otros y LEADERS_ONLY fuera de rol deben comportarse como "no encontrada", nunca 403 (no confirmar existencia). */
  private assertNoteVisible(note: NoteRecord, userId: string, role: MembershipRole) {
    if (note.visibility === 'PRIVATE' && note.authorId !== userId) throw new NotFoundException('Nota no encontrada');
    if (note.visibility === 'LEADERS_ONLY' && !this.permissions.isLeadershipRole(role)) throw new NotFoundException('Nota no encontrada');
  }

  async list(member: OrgMember, songId: string, query: SongNoteListQueryData) {
    const { userId, organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);

    const versionId = query.versionId ? query.versionId : undefined;
    if (versionId) await assertSongVersionAccess(this.songsRepository, songId, versionId);

    const andConditions: Prisma.SongNoteWhereInput[] = [this.permissions.buildVisibleSongNoteWhere(userId, member.role)];
    if (query.visibility) andConditions.push({ visibility: query.visibility });
    if (!query.includeArchived) andConditions.push({ isArchived: false });
    if (versionId !== undefined) {
      andConditions.push(versionId === null ? { versionId: null } : { OR: [{ versionId: null }, { versionId }] });
    }

    const notes = await this.notesRepository.list(songId, { AND: andConditions });
    return notes.map((note) => normalizeNote(note as NoteRecord));
  }

  async get(member: OrgMember, songId: string, noteId: string) {
    const { userId, organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);
    const note = await this.assertNoteInSong(songId, noteId);
    this.assertNoteVisible(note, userId, member.role);
    return normalizeNote(note);
  }

  async create(member: OrgMember, songId: string, data: CreateSongNoteData) {
    const { userId, organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);

    if (!this.permissions.canCreateSongNoteVisibility(member.role, data.visibility)) {
      throw new ForbiddenException('No tienes permiso para crear notas con esta visibilidad');
    }

    const version = await assertSongVersionAccess(this.songsRepository, songId, data.versionId);

    const created = await this.notesRepository.create({
      songId,
      versionId: version?.id,
      organizationId,
      authorId: userId,
      title: data.title,
      content: data.content,
      visibility: data.visibility,
      isPinned: data.isPinned ?? false,
    });
    const createdTitleSuffix = created.title ? ` "${created.title}"` : '';
    await this.recordNoteActivityBestEffort(created as NoteRecord, {
      organizationId,
      actorId: userId,
      action: 'NOTE_CREATED',
      summary: `Agregó una nota${createdTitleSuffix}`,
    });
    return normalizeNote(created as NoteRecord);
  }

  async update(member: OrgMember, songId: string, noteId: string, input: Record<string, unknown>) {
    const { userId, organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);
    const existing = await this.assertNoteInSong(songId, noteId);
    this.assertNoteVisible(existing, userId, member.role);

    if (!this.permissions.canModifySongNote(member.role, existing, userId)) {
      throw new ForbiddenException('No tienes permiso para editar esta nota');
    }

    // Se valida aqui y no con ZodPipe: quien no tiene permiso recibe 403 aunque el cuerpo sea invalido.
    const data = parseOrBadRequest(updateSongNoteSchema, input);

    if (data.visibility && !this.permissions.canCreateSongNoteVisibility(member.role, data.visibility)) {
      throw new ForbiddenException('No tienes permiso para usar esta visibilidad');
    }

    const version = data.versionId === undefined ? undefined : await assertSongVersionAccess(this.songsRepository, songId, data.versionId);

    const updated = await this.notesRepository.update(noteId, clean({
      versionId: data.versionId === undefined ? undefined : (version?.id ?? null),
      title: data.title,
      content: data.content,
      visibility: data.visibility,
    }));
    await this.recordNoteActivityBestEffort(updated as NoteRecord, {
      organizationId,
      actorId: userId,
      action: 'NOTE_UPDATED',
      summary: `Actualizó una nota${updated.title ? ` "${updated.title}"` : ''}`,
    });
    return normalizeNote(updated as NoteRecord);
  }

  async delete(member: OrgMember, songId: string, noteId: string) {
    const { userId, organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);
    const existing = await this.assertNoteInSong(songId, noteId);
    this.assertNoteVisible(existing, userId, member.role);
    if (!this.permissions.canModifySongNote(member.role, existing, userId)) {
      throw new ForbiddenException('No tienes permiso para eliminar esta nota');
    }
    await this.notesRepository.delete(noteId);
    await this.recordNoteActivityBestEffort(existing, {
      organizationId,
      actorId: userId,
      action: 'NOTE_DELETED',
      summary: `Eliminó una nota${existing.title ? ` "${existing.title}"` : ''}`,
    });
    return { ok: true };
  }

  async togglePin(member: OrgMember, songId: string, noteId: string) {
    const { userId, organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);
    const existing = await this.assertNoteInSong(songId, noteId);
    this.assertNoteVisible(existing, userId, member.role);
    if (!this.permissions.canModifySongNote(member.role, existing, userId)) {
      throw new ForbiddenException('No tienes permiso para fijar esta nota');
    }
    const updated = await this.notesRepository.togglePin(noteId);
    await this.recordNoteActivityBestEffort(updated as NoteRecord, {
      organizationId,
      actorId: userId,
      action: 'NOTE_PINNED',
      summary: (updated as NoteRecord).isPinned ? 'Fijó una nota' : 'Desfijó una nota',
    });
    return normalizeNote(updated as NoteRecord);
  }

  async toggleArchive(member: OrgMember, songId: string, noteId: string) {
    const { userId, organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);
    const existing = await this.assertNoteInSong(songId, noteId);
    this.assertNoteVisible(existing, userId, member.role);
    if (!this.permissions.canModifySongNote(member.role, existing, userId)) {
      throw new ForbiddenException('No tienes permiso para archivar esta nota');
    }
    const updated = await this.notesRepository.toggleArchive(noteId);
    await this.recordNoteActivityBestEffort(updated as NoteRecord, {
      organizationId,
      actorId: userId,
      action: 'NOTE_ARCHIVED',
      summary: (updated as NoteRecord).isArchived ? 'Archivó una nota' : 'Restauró una nota archivada',
    });
    return normalizeNote(updated as NoteRecord);
  }
}
