import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  createSetlistSchema,
  saveSetlistAsTemplateSchema,
  setlistListQuerySchema,
  updateSetlistSchema,
  type CreateSetlistData,
  type SaveSetlistAsTemplateData,
  type SetlistListQueryData,
  type UpdateSetlistData,
} from '@harmonyhub/contracts';
import { ZodPipe } from '../shared/zod.pipe';
import { AuthGuard } from '../auth/auth.guard';
import { SetlistsService } from './setlists.service';
import { CurrentMembership, OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';

@Controller('api/setlists')
@UseGuards(AuthGuard, PermissionsGuard)
export class SetlistsController {
  constructor(@Inject(SetlistsService) private readonly setlistsService: SetlistsService) {}

  @Get()
  @RequirePermission('read')
  list(@CurrentMembership() member: OrgMember, @Query(new ZodPipe(setlistListQuerySchema, 'Filtros invalidos')) query: SetlistListQueryData) {
    return this.setlistsService.list(member, query);
  }

  @Get(':id')
  @RequirePermission('read')
  detail(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.setlistsService.detail(member, id);
  }

  @Post()
  @RequirePermission('setlists.manage')
  create(@CurrentMembership() member: OrgMember, @Body(new ZodPipe(createSetlistSchema)) body: CreateSetlistData) {
    return this.setlistsService.create(member, body);
  }

  @Post(':id/save-as-template')
  @RequirePermission('setlists.manage')
  saveAsTemplate(
    @CurrentMembership() member: OrgMember,
    @Param('id') id: string,
    @Body(new ZodPipe(saveSetlistAsTemplateSchema)) body: SaveSetlistAsTemplateData,
  ) {
    return this.setlistsService.saveAsTemplate(member, id, body);
  }

  @Patch(':id')
  @RequirePermission('setlists.manage')
  update(@CurrentMembership() member: OrgMember, @Param('id') id: string, @Body(new ZodPipe(updateSetlistSchema)) body: UpdateSetlistData) {
    return this.setlistsService.update(member, id, body);
  }

  @Post(':id/archive')
  @RequirePermission('setlists.archive')
  archive(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.setlistsService.archive(member, id);
  }

  @Post(':id/publish')
  @RequirePermission('setlists.publish')
  publish(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.setlistsService.publish(member, id);
  }

  @Delete(':id')
  @RequirePermission('setlists.delete')
  remove(@CurrentMembership() member: OrgMember, @Param('id') id: string) {
    return this.setlistsService.delete(member, id);
  }
}
