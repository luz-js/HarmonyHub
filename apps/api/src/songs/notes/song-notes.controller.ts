import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { createSongNoteSchema, songNoteListQuerySchema, type CreateSongNoteData, type SongNoteListQueryData } from '@harmonyhub/contracts';
import { ZodPipe } from '../../shared/zod.pipe';
import { AuthGuard } from '../../auth/auth.guard';
import { SongNotesService } from './song-notes.service';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';

@Controller('api/songs')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermission('read')
export class SongNotesController {
  constructor(@Inject(SongNotesService) private readonly notesService: SongNotesService) {}

  @Get(':id/notes')
  list(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Query(new ZodPipe(songNoteListQuerySchema)) query: SongNoteListQueryData) {
    return this.notesService.list(member, id, query);
  }

  @Get(':id/notes/:noteId')
  get(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('noteId') noteId: string) {
    return this.notesService.get(member, id, noteId);
  }

  @Post(':id/notes')
  create(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(createSongNoteSchema)) body: CreateSongNoteData) {
    return this.notesService.create(member, id, body);
  }

  @Patch(':id/notes/:noteId')
  update(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('noteId') noteId: string, @Body() body: Record<string, unknown>) {
    return this.notesService.update(member, id, noteId, body ?? {});
  }

  @Delete(':id/notes/:noteId')
  remove(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('noteId') noteId: string) {
    return this.notesService.delete(member, id, noteId);
  }

  @Post(':id/notes/:noteId/pin')
  togglePin(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('noteId') noteId: string) {
    return this.notesService.togglePin(member, id, noteId);
  }

  @Post(':id/notes/:noteId/archive')
  toggleArchive(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Param('noteId') noteId: string) {
    return this.notesService.toggleArchive(member, id, noteId);
  }
}
