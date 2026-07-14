import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../auth/current-user.decorator';
import { SongCollaborationService } from './song-collaboration.service';

@Controller('api/songs')
@UseGuards(AuthGuard)
export class SongCollaborationController {
  constructor(@Inject(SongCollaborationService) private readonly collaborationService: SongCollaborationService) {}

  @Get(':id/threads')
  listThreads(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Query() query: Record<string, unknown>) {
    return this.collaborationService.listThreads(user.id, organizationId, id, query);
  }

  @Get(':id/threads/:threadId')
  getThread(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('threadId') threadId: string) {
    return this.collaborationService.getThread(user.id, organizationId, id, threadId);
  }

  @Post(':id/threads')
  createThread(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.collaborationService.createThread(user.id, organizationId, id, body ?? {});
  }

  @Patch(':id/threads/:threadId')
  updateThread(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('threadId') threadId: string, @Body() body: Record<string, unknown>) {
    return this.collaborationService.updateThread(user.id, organizationId, id, threadId, body ?? {});
  }

  @Post(':id/threads/:threadId/resolve')
  resolveThread(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('threadId') threadId: string) {
    return this.collaborationService.resolveThread(user.id, organizationId, id, threadId);
  }

  @Post(':id/threads/:threadId/reopen')
  reopenThread(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('threadId') threadId: string) {
    return this.collaborationService.reopenThread(user.id, organizationId, id, threadId);
  }

  @Post(':id/threads/:threadId/comments')
  createComment(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('threadId') threadId: string, @Body() body: Record<string, unknown>) {
    return this.collaborationService.createComment(user.id, organizationId, id, threadId, body ?? {});
  }

  @Patch(':id/threads/:threadId/comments/:commentId')
  updateComment(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('threadId') threadId: string, @Param('commentId') commentId: string, @Body() body: Record<string, unknown>) {
    return this.collaborationService.updateComment(user.id, organizationId, id, threadId, commentId, body ?? {});
  }

  @Delete(':id/threads/:threadId/comments/:commentId')
  deleteComment(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('threadId') threadId: string, @Param('commentId') commentId: string) {
    return this.collaborationService.deleteComment(user.id, organizationId, id, threadId, commentId);
  }
}
