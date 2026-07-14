import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PermissionsService } from '../permissions/permissions.service';
import { SongsRepository } from './songs.repository';

/**
 * Helper compartido para validar acceso a una cancion + obtener la membresia
 * del usuario (rol incluido). Usado por los modulos de notas y colaboracion
 * para no repetir la misma verificacion de organizacion/cancion en cada servicio.
 */
export async function assertSongAccess(
  songsRepository: SongsRepository,
  permissions: PermissionsService,
  userId: string,
  organizationId: string,
  songId: string,
) {
  const membership = await permissions.assertOrganizationMember(userId, organizationId);
  const song = await songsRepository.findSongSummaryInOrganization(songId, organizationId);
  if (!song) throw new NotFoundException('Cancion no encontrada');
  return { song, membership };
}

/** Valida que, si se indica una version, pertenezca realmente a la cancion. */
export async function assertSongVersionAccess(songsRepository: SongsRepository, songId: string, versionId?: string | null) {
  if (!versionId) return null;
  const version = await songsRepository.findVersion(songId, versionId);
  if (!version) throw new BadRequestException('La version indicada no pertenece a esta cancion');
  return version;
}
