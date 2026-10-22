import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { SongCollaborationService } from './song-collaboration.service';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';

@Controller('api/songs')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermission('read')
export class SongCollaborationController {
  constructor(@Inject(SongCollaborationService) private readonly collaborationService: SongCollaborationService) {}

  @Get(':id/threads')
  listThreads(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Query() query: Record<string, unknown>) {
    return this.collaborationService.listThreads(member, id, query);
  }

  @Get(':id/threads/:threadId')
  getThread(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('threadId') threadId: string) {
    return this.collaborationService.getThread(member, id, threadId);
  }

  @Post(':id/threads')
  createThread(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.collaborationService.createThread(member, id, body ?? {});
  }

  @Patch(':id/threads/:threadId')
  updateThread(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('threadId') threadId: string, @Body() body: Record<string, unknown>) {
    return this.collaborationService.updateThread(member, id, threadId, body ?? {});
  }

  @Post(':id/threads/:threadId/resolve')
  resolveThread(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('threadId') threadId: string) {
    return this.collaborationService.resolveThread(member, id, threadId);
  }

  @Post(':id/threads/:threadId/reopen')
  reopenThread(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('threadId') threadId: string) {
    return this.collaborationService.reopenThread(member, id, threadId);
  }

  @Post(':id/threads/:threadId/comments')
  createComment(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('threadId') threadId: string, @Body() body: Record<string, unknown>) {
    return this.collaborationService.createComment(member, id, threadId, body ?? {});
  }

  @Patch(':id/threads/:threadId/comments/:commentId')
  updateComment(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('threadId') threadId: string, @Param('commentId') commentId: string, @Body() body: Record<string, unknown>) {
    return this.collaborationService.updateComment(member, id, threadId, commentId, body ?? {});
  }

  @Delete(':id/threads/:threadId/comments/:commentId')
  deleteComment(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('threadId') threadId: string, @Param('commentId') commentId: string) {
    return this.collaborationService.deleteComment(member, id, threadId, commentId);
  }
}
