import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { importChordProSchema, type ImportChordProData } from '@harmonyhub/contracts';
import { AuthGuard } from '../../auth/auth.guard';
import { CurrentMembership, OrgMember } from '../../permissions/current-membership.decorator';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { RequirePermission } from '../../permissions/require-permission.decorator';
import { ZodPipe } from '../../shared/zod.pipe';
import { SongImportService } from './song-import.service';

/** Importar canciones desde otros formatos (por ahora ChordPro). */
@Controller('api/songs/import')
@UseGuards(AuthGuard, PermissionsGuard)
export class SongImportController {
  constructor(@Inject(SongImportService) private readonly imports: SongImportService) {}

  @Post('chordpro')
  @RequirePermission('songs.manage')
  importChordPro(@CurrentMembership() member: OrgMember, @Body(new ZodPipe(importChordProSchema)) body: ImportChordProData) {
    return this.imports.importChordPro(member, body);
  }
}
