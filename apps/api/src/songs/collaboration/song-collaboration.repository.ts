import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const userRefSelect = { id: true, name: true, avatarUrl: true } satisfies Prisma.UserSelect;

const threadOrderBy: Prisma.SongCommentThreadOrderByWithRelationInput[] = [{ updatedAt: 'desc' }];

const threadListInclude = {
  version: { select: { id: true, name: true, key: true, isDefault: true } },
  createdBy: { select: userRefSelect },
  resolvedBy: { select: userRefSelect },
  _count: { select: { comments: { where: { deletedAt: null } } } },
  comments: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: { author: { select: userRefSelect } },
  },
} satisfies Prisma.SongCommentThreadInclude;

const commentInclude = {
  author: { select: userRefSelect },
  mentions: { select: { userId: true } },
} satisfies Prisma.SongCommentInclude;

@Injectable()
export class SongCollaborationRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listThreads(songId: string, where: Prisma.SongCommentThreadWhereInput) {
    return this.prisma.songCommentThread.findMany({ where: { songId, ...where }, orderBy: threadOrderBy, include: threadListInclude });
  }

  findThreadSummary(songId: string, threadId: string) {
    return this.prisma.songCommentThread.findFirst({ where: { id: threadId, songId }, include: threadListInclude });
  }

  findThreadWithComments(songId: string, threadId: string) {
    return this.prisma.songCommentThread.findFirst({
      where: { id: threadId, songId },
      include: {
        version: { select: { id: true, name: true, key: true, isDefault: true } },
        createdBy: { select: userRefSelect },
        resolvedBy: { select: userRefSelect },
        comments: { orderBy: { createdAt: 'asc' }, include: commentInclude },
      },
    });
  }

  createThread(data: Prisma.SongCommentThreadUncheckedCreateInput) {
    return this.prisma.songCommentThread.create({ data, include: threadListInclude });
  }

  updateThread(threadId: string, data: Prisma.SongCommentThreadUncheckedUpdateInput) {
    return this.prisma.songCommentThread.update({ where: { id: threadId }, data, include: threadListInclude });
  }

  createComment(data: Prisma.SongCommentUncheckedCreateInput, mentionedUserIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.songComment.create({ data });
      if (mentionedUserIds.length > 0) {
        await tx.songCommentMention.createMany({ data: mentionedUserIds.map((userId) => ({ commentId: comment.id, userId })) });
      }
      await tx.songCommentThread.update({ where: { id: data.threadId }, data: { updatedAt: new Date() } });
      return tx.songComment.findUniqueOrThrow({ where: { id: comment.id }, include: commentInclude });
    });
  }

  findCommentInThread(threadId: string, commentId: string) {
    return this.prisma.songComment.findFirst({ where: { id: commentId, threadId }, include: commentInclude });
  }

  updateComment(commentId: string, content: string) {
    return this.prisma.songComment.update({ where: { id: commentId }, data: { content, editedAt: new Date() }, include: commentInclude });
  }

  softDeleteComment(commentId: string) {
    return this.prisma.songComment.update({ where: { id: commentId }, data: { deletedAt: new Date() }, include: commentInclude });
  }

  findVersionContent(versionId: string) {
    return this.prisma.songVersion.findUnique({ where: { id: versionId }, select: { contentJson: true } });
  }

  async findActiveMembershipUserIds(organizationId: string, userIds: string[]) {
    if (userIds.length === 0) return [];
    const rows = await this.prisma.membership.findMany({
      where: { organizationId, userId: { in: userIds }, status: 'ACTIVE' },
      select: { userId: true },
    });
    return rows.map((row) => row.userId);
  }
}
