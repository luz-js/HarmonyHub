import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  updateSongCommentSchema,
  updateSongThreadSchema,
  type CreateSongCommentData,
  type CreateSongThreadData,
  type SongThreadListQueryData,
} from '@harmonyhub/contracts';
import { parseOrBadRequest } from '../../shared/zod.pipe';
import { Prisma, SongCommentTarget, SongThreadStatus } from '@prisma/client';
import { PermissionsService } from '../../permissions/permissions.service';
import { clean } from '../../shared/object.utils';
import { SongActivityService } from '../activity/song-activity.service';
import { assertSongAccess, assertSongVersionAccess } from '../song-access.utils';
import { SongsRepository } from '../songs.repository';
import { SongCollaborationRepository } from './song-collaboration.repository';
import { assertValidThreadTarget, InvalidThreadTargetError, normalizeMentionedUserIds, sectionExistsInContent } from './song-collaboration.utils';
import type { OrgMember } from '../../permissions/current-membership.decorator';

@Injectable()
export class SongCollaborationService {
  constructor(
    @Inject(SongsRepository) private readonly songsRepository: SongsRepository,
    @Inject(SongCollaborationRepository) private readonly collabRepository: SongCollaborationRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
    @Inject(SongActivityService) private readonly activity: SongActivityService,
  ) {}

  private async assertThreadInSong(songId: string, threadId: string) {
    const thread = await this.collabRepository.findThreadSummary(songId, threadId);
    if (!thread) throw new NotFoundException('Conversacion no encontrada');
    return thread;
  }

  private normalizeComment(comment: {
    id: string;
    threadId: string;
    content: string;
    deletedAt: Date | null;
    editedAt: Date | null;
    author?: { id: string; name: string; avatarUrl: string | null } | null;
    mentions?: Array<{ userId: string }>;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const isDeleted = Boolean(comment.deletedAt);
    return {
      id: comment.id,
      threadId: comment.threadId,
      content: isDeleted ? null : comment.content,
      isDeleted,
      editedAt: comment.editedAt,
      author: comment.author ?? null,
      mentionedUserIds: (comment.mentions || []).map((mention) => mention.userId),
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  private normalizeThread(thread: {
    id: string;
    songId: string;
    versionId: string | null;
    targetType: SongCommentTarget;
    targetRef: string | null;
    title: string | null;
    status: SongThreadStatus;
    resolvedAt: Date | null;
    resolvedBy?: { id: string; name: string; avatarUrl: string | null } | null;
    createdBy?: { id: string; name: string; avatarUrl: string | null } | null;
    version?: { id: string; name: string; key: string; isDefault: boolean } | null;
    _count?: { comments: number };
    comments?: Array<Parameters<SongCollaborationService['normalizeComment']>[0]>;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const lastComment = thread.comments?.[0];
    return {
      id: thread.id,
      songId: thread.songId,
      versionId: thread.versionId,
      targetType: thread.targetType,
      targetRef: thread.targetRef,
      title: thread.title,
      status: thread.status,
      resolvedAt: thread.resolvedAt,
      resolvedBy: thread.resolvedBy ?? null,
      createdBy: thread.createdBy ?? null,
      version: thread.version ?? null,
      commentsCount: thread._count?.comments ?? 0,
      lastComment: lastComment ? this.normalizeComment(lastComment) : null,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    };
  }

  private async resolveMentions(organizationId: string, mentionedUserIds: unknown) {
    const ids = normalizeMentionedUserIds(mentionedUserIds);
    if (ids.length === 0) return [];
    const validIds = await this.collabRepository.findActiveMembershipUserIds(organizationId, ids);
    if (validIds.length !== ids.length) {
      throw new BadRequestException('Uno o mas usuarios mencionados no pertenecen a la organizacion o no estan activos');
    }
    return validIds;
  }

  async listThreads(member: OrgMember, songId: string, query: SongThreadListQueryData) {
    const { organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);

    const versionId = query.versionId ? query.versionId : undefined;
    if (versionId) await assertSongVersionAccess(this.songsRepository, songId, versionId);

    const andConditions: Prisma.SongCommentThreadWhereInput[] = [];
    if (query.status) andConditions.push({ status: query.status });
    if (query.targetType) andConditions.push({ targetType: query.targetType });
    if (query.targetRef) andConditions.push({ targetRef: query.targetRef });
    if (versionId !== undefined) andConditions.push(versionId === null ? { versionId: null } : { OR: [{ versionId: null }, { versionId }] });

    const where: Prisma.SongCommentThreadWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};
    const threads = await this.collabRepository.listThreads(songId, where);
    return threads.map((thread) => this.normalizeThread(thread));
  }

  async getThread(member: OrgMember, songId: string, threadId: string) {
    const { organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);
    const thread = await this.collabRepository.findThreadWithComments(songId, threadId);
    if (!thread) throw new NotFoundException('Conversacion no encontrada');
    return {
      id: thread.id,
      songId: thread.songId,
      versionId: thread.versionId,
      targetType: thread.targetType,
      targetRef: thread.targetRef,
      title: thread.title,
      status: thread.status,
      resolvedAt: thread.resolvedAt,
      resolvedBy: thread.resolvedBy ?? null,
      createdBy: thread.createdBy ?? null,
      version: thread.version ?? null,
      commentsCount: thread.comments.filter((comment) => !comment.deletedAt).length,
      comments: thread.comments.map((comment) => this.normalizeComment(comment)),
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    };
  }

  async createThread(member: OrgMember, songId: string, data: CreateSongThreadData) {
    const { userId, organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);

    try {
      assertValidThreadTarget(data.targetType, data.versionId, data.targetRef);
    } catch (error) {
      if (error instanceof InvalidThreadTargetError) throw new BadRequestException(error.message);
      throw error;
    }

    const version = await assertSongVersionAccess(this.songsRepository, songId, data.versionId);

    if (data.targetType === 'SECTION' && version && data.targetRef) {
      const versionContent = await this.collabRepository.findVersionContent(version.id);
      if (versionContent?.contentJson && !sectionExistsInContent(versionContent.contentJson, data.targetRef)) {
        throw new BadRequestException('La seccion indicada no existe en el contenido actual de la version');
      }
    }

    const mentionedUserIds = await this.resolveMentions(organizationId, data.mentionedUserIds);

    const thread = await this.collabRepository.createThread({
      songId,
      versionId: version?.id,
      organizationId,
      createdById: userId,
      targetType: data.targetType,
      targetRef: data.targetRef,
      title: data.title,
      comments: {
        create: {
          authorId: userId,
          content: data.content,
          mentions: mentionedUserIds.length > 0 ? { create: mentionedUserIds.map((mentionedUserId) => ({ userId: mentionedUserId })) } : undefined,
        },
      },
    });
    await this.activity.recordBestEffort({
      songId,
      versionId: version?.id ?? null,
      organizationId,
      actorId: userId,
      action: 'THREAD_CREATED',
      entityType: 'THREAD',
      entityId: thread.id,
      summary: `Inició una conversación${thread.title ? ` "${thread.title}"` : ''}`,
    });
    return this.normalizeThread(thread);
  }

  async updateThread(member: OrgMember, songId: string, threadId: string, input: Record<string, unknown>) {
    const { userId, organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);
    const existing = await this.assertThreadInSong(songId, threadId);
    if (!this.permissions.isLeadershipRole(member.role) && existing.createdById !== userId) {
      throw new ForbiddenException('No tienes permiso para editar esta conversacion');
    }

    // Se valida aqui y no con ZodPipe: quien no tiene permiso recibe 403 aunque el cuerpo sea invalido.
    const data = parseOrBadRequest(updateSongThreadSchema, input);

    const updated = await this.collabRepository.updateThread(threadId, clean({ title: data.title }));
    return this.normalizeThread(updated);
  }

  async resolveThread(member: OrgMember, songId: string, threadId: string) {
    const { userId, organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);
    const existing = await this.assertThreadInSong(songId, threadId);
    if (!this.permissions.canResolveSongThread(member.role, existing.createdById === userId)) {
      throw new ForbiddenException('No tienes permiso para resolver esta conversacion');
    }
    const updated = await this.collabRepository.updateThread(threadId, { status: 'RESOLVED', resolvedAt: new Date(), resolvedById: userId });
    await this.activity.recordBestEffort({
      songId,
      versionId: existing.versionId,
      organizationId,
      actorId: userId,
      action: 'THREAD_RESOLVED',
      entityType: 'THREAD',
      entityId: threadId,
      summary: `Resolvió una conversación${existing.title ? ` "${existing.title}"` : ''}`,
    });
    return this.normalizeThread(updated);
  }

  async reopenThread(member: OrgMember, songId: string, threadId: string) {
    const { userId, organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);
    const existing = await this.assertThreadInSong(songId, threadId);
    if (!this.permissions.canResolveSongThread(member.role, existing.createdById === userId)) {
      throw new ForbiddenException('No tienes permiso para reabrir esta conversacion');
    }
    const updated = await this.collabRepository.updateThread(threadId, { status: 'OPEN', resolvedAt: null, resolvedById: null });
    await this.activity.recordBestEffort({
      songId,
      versionId: existing.versionId,
      organizationId,
      actorId: userId,
      action: 'THREAD_REOPENED',
      entityType: 'THREAD',
      entityId: threadId,
      summary: `Reabrió una conversación${existing.title ? ` "${existing.title}"` : ''}`,
    });
    return this.normalizeThread(updated);
  }

  async createComment(member: OrgMember, songId: string, threadId: string, data: CreateSongCommentData) {
    const { userId, organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);
    const thread = await this.assertThreadInSong(songId, threadId);

    const mentionedUserIds = await this.resolveMentions(organizationId, data.mentionedUserIds);
    const comment = await this.collabRepository.createComment({ threadId: thread.id, authorId: userId, content: data.content }, mentionedUserIds);
    await this.activity.recordBestEffort({
      songId,
      versionId: thread.versionId,
      organizationId,
      actorId: userId,
      action: 'COMMENT_ADDED',
      entityType: 'COMMENT',
      entityId: comment.id,
      summary: `Comentó en una conversación${thread.title ? ` "${thread.title}"` : ''}`,
    });
    return this.normalizeComment(comment);
  }

  async updateComment(member: OrgMember, songId: string, threadId: string, commentId: string, input: Record<string, unknown>) {
    const { userId, organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);
    await this.assertThreadInSong(songId, threadId);
    const comment = await this.collabRepository.findCommentInThread(threadId, commentId);
    if (!comment || comment.deletedAt) throw new NotFoundException('Comentario no encontrado');
    if (comment.authorId !== userId) throw new ForbiddenException('Solo el autor puede editar su comentario');

    // Se valida aqui y no con ZodPipe: quien no tiene permiso recibe 403 aunque el cuerpo sea invalido.
    const data = parseOrBadRequest(updateSongCommentSchema, input);

    const updated = await this.collabRepository.updateComment(commentId, data.content);
    return this.normalizeComment(updated);
  }

  async deleteComment(member: OrgMember, songId: string, threadId: string, commentId: string) {
    const { userId, organizationId } = member;
    await assertSongAccess(this.songsRepository, organizationId, songId);
    await this.assertThreadInSong(songId, threadId);
    const comment = await this.collabRepository.findCommentInThread(threadId, commentId);
    if (!comment || comment.deletedAt) throw new NotFoundException('Comentario no encontrado');
    if (comment.authorId !== userId && !this.permissions.canModerateSongComment(member.role)) {
      throw new ForbiddenException('No tienes permiso para eliminar este comentario');
    }
    await this.collabRepository.softDeleteComment(commentId);
    return { ok: true };
  }
}
