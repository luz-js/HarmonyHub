import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentMembership, OrgMember } from '../permissions/current-membership.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { SongsFilesService } from './songs-files.service';

/** Archivos de toda la organizacion (pagina Archivos). Ver, previsualizar y descargar usa las rutas de cada cancion. */
@Controller('api/files')
@UseGuards(AuthGuard, PermissionsGuard)
export class FilesController {
  constructor(@Inject(SongsFilesService) private readonly filesService: SongsFilesService) {}

  @Get()
  @RequirePermission('read')
  list(@CurrentMembership() member: OrgMember, @Query() query: Record<string, unknown>) {
    return this.filesService.organizationFiles(member, query);
  }
}
