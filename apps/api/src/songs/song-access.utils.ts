import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SongsRepository } from './songs.repository';

/**
 * Helper compartido: valida que la cancion sea de la organizacion (si no, 404). La membresia y el
 * permiso ya los verifico PermissionsGuard; el rol llega a los servicios via @CurrentMembership().
 */
export async function assertSongAccess(songsRepository: SongsRepository, organizationId: string, songId: string) {
  const song = await songsRepository.findSongSummaryInOrganization(songId, organizationId);
  if (!song) throw new NotFoundException('Cancion no encontrada');
  return song;
}

/** Valida que, si se indica una version, pertenezca realmente a la cancion. */
export async function assertSongVersionAccess(songsRepository: SongsRepository, songId: string, versionId?: string | null) {
  if (!versionId) return null;
  const version = await songsRepository.findVersion(songId, versionId);
  if (!version) throw new BadRequestException('La version indicada no pertenece a esta cancion');
  return version;
}
