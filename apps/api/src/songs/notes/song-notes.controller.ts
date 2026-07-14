import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../auth/current-user.decorator';
import { SongNotesService } from './song-notes.service';

@Controller('api/songs')
@UseGuards(AuthGuard)
export class SongNotesController {
  constructor(@Inject(SongNotesService) private readonly notesService: SongNotesService) {}

  @Get(':id/notes')
  list(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Query() query: Record<string, unknown>) {
    return this.notesService.list(user.id, organizationId, id, query);
  }

  @Get(':id/notes/:noteId')
  get(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('noteId') noteId: string) {
    return this.notesService.get(user.id, organizationId, id, noteId);
  }

  @Post(':id/notes')
  create(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.notesService.create(user.id, organizationId, id, body ?? {});
  }

  @Patch(':id/notes/:noteId')
  update(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('noteId') noteId: string, @Body() body: Record<string, unknown>) {
    return this.notesService.update(user.id, organizationId, id, noteId, body ?? {});
  }

  @Delete(':id/notes/:noteId')
  remove(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('noteId') noteId: string) {
    return this.notesService.delete(user.id, organizationId, id, noteId);
  }

  @Post(':id/notes/:noteId/pin')
  togglePin(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('noteId') noteId: string) {
    return this.notesService.togglePin(user.id, organizationId, id, noteId);
  }

  @Post(':id/notes/:noteId/archive')
  toggleArchive(@CurrentUser() user: CurrentUserPayload, @Headers('x-organization-id') organizationId: string, @Param('id') id: string, @Param('noteId') noteId: string) {
    return this.notesService.toggleArchive(user.id, organizationId, id, noteId);
  }
}
