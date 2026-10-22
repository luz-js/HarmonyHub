import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { organizationFilesQuerySchema, type OrganizationFilesQueryData } from '@harmonyhub/contracts';
import { ZodPipe } from '../../shared/zod.pipe';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';
import { SongFilesService } from './song-files.service';

/** Archivos de toda la organizacion (pagina Archivos). Ver, previsualizar y descargar usa las rutas de cada cancion. */
@Controller('api/files')
@UseGuards(AuthGuard, PermissionsGuard)
export class OrganizationFilesController {
  constructor(@Inject(SongFilesService) private readonly filesService: SongFilesService) {}

  @Get()
  @RequirePermission('read')
  list(@CurrentMembership() member: OrgMember, @Query(new ZodPipe(organizationFilesQuerySchema)) query: OrganizationFilesQueryData) {
    return this.filesService.organizationFiles(member, query);
  }
}
