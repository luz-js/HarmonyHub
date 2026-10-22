import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { normalizeOptionalId } from './songs.schemas';
import { SongsRepository } from './songs.repository';
import { SongTracksRepository } from './tracks/song-tracks.repository';
import { SongFilesRepository } from './files/song-files.repository';
import { SongLinksRepository } from './links/song-links.repository';

/**
 * Comprobaciones de recurso de canciones (que la cancion, version, pista... sean de la organizacion).
 * Los permisos por rol los verifica PermissionsGuard con @RequirePermission en cada ruta.
 */
@Injectable()
export class SongsAccessService {
  constructor(
    @Inject(SongsRepository) private readonly songsRepository: SongsRepository,
    @Inject(SongTracksRepository) private readonly tracksRepository: SongTracksRepository,
    @Inject(SongFilesRepository) private readonly filesRepository: SongFilesRepository,
    @Inject(SongLinksRepository) private readonly linksRepository: SongLinksRepository,
  ) {}

  async assertSongInOrganization(organizationId: string, songId: string) {
    const song = await this.songsRepository.findSongSummaryInOrganization(songId, organizationId);
    if (!song) throw new NotFoundException('Cancion no encontrada');
    return song;
  }

  async assertSongDetailInOrganization(organizationId: string, songId: string) {
    const song = await this.songsRepository.findByIdInOrganization(songId, organizationId);
    if (!song || song.status === 'ARCHIVED') throw new NotFoundException('Cancion no encontrada');
    return song;
  }

  async assertVersionInSong(songId: string, versionId?: string | null) {
    const normalizedVersionId = normalizeOptionalId(versionId);
    if (!normalizedVersionId) return null;
    const version = await this.songsRepository.findVersion(songId, normalizedVersionId);
    if (!version) throw new BadRequestException('La version indicada no pertenece a esta cancion');
    return version;
  }

  async assertTrackInSong(songId: string, trackId: string) {
    const track = await this.tracksRepository.findTrack(songId, trackId);
    if (!track) throw new NotFoundException('Pista no encontrada');
    return track;
  }

  async assertSongFileInSong(songId: string, songFileId: string) {
    const songFile = await this.filesRepository.findSongFile(songId, songFileId);
    if (!songFile) throw new NotFoundException('Archivo no encontrado');
    return songFile;
  }

  async assertLinkInSong(songId: string, linkId: string) {
    const link = await this.linksRepository.findLink(songId, linkId);
    if (!link) throw new NotFoundException('Enlace no encontrado');
    return link;
  }
}
