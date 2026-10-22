import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  createSongSchema,
  updateSongSchema,
  type CreateSongData,
  type UpdateSongData,
} from '@harmonyhub/contracts';
import { ZodPipe } from '../shared/zod.pipe';
import { AuthGuard } from '../auth/auth.guard';
import { SongsService } from './songs.service';
import { CurrentMembership, OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';

/**
 * Canciones: listar, ver el detalle, crear, editar y archivar. Versiones, enlaces, pistas y archivos tienen su
 * propio controller en su carpeta (mismas rutas api/songs/:id/...).
 */
@Controller('api/songs')
@UseGuards(AuthGuard, PermissionsGuard)
export class SongsController {
  constructor(@Inject(SongsService) private readonly songsService: SongsService) {}

  @Get()
  @RequirePermission('read', { organizationFrom: 'headerOrQuery' })
  list(@CurrentMembership() member: OrgMember, @Query() query: Record<string, unknown>) {
    return this.songsService.list(member, query);
  }

  @Get(':id')
  @RequirePermission('read')
  detail(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.songsService.detail(member, id);
  }

  @Post()
  @RequirePermission('songs.manage')
  create(@CurrentMembership() member: OrgMember, @Body(new ZodPipe(createSongSchema)) body: CreateSongData) {
    return this.songsService.create(member, body);
  }

  @Patch(':id')
  @RequirePermission('songs.manage')
  update(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(updateSongSchema)) body: UpdateSongData) {
    return this.songsService.update(member, id, body);
  }

  @Delete(':id')
  @RequirePermission('songs.manage')
  archive(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.songsService.archive(member, id);
  }
}
