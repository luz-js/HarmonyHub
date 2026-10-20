import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PermissionsService } from '../permissions/permissions.service';
import { normalizeOptionalId } from './songs.schemas';
import { SongsRepository } from './songs.repository';

@Injectable()
export class SongsAccessService {
  constructor(
    @Inject(SongsRepository) private readonly songsRepository: SongsRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async assertSongInOrganization(userId: string, organizationId: string, songId: string, permission: 'read' | 'songs.manage' = 'read') {
    if (permission === 'songs.manage') {
      await this.permissions.assertPermission(userId, organizationId, 'songs.manage');
    } else {
      await this.permissions.assertOrganizationMember(userId, organizationId);
    }

    const song = await this.songsRepository.findSongSummaryInOrganization(songId, organizationId);
    if (!song) throw new NotFoundException('Cancion no encontrada');
    return song;
  }

  async assertSongDetailInOrganization(userId: string, organizationId: string, songId: string) {
    await this.permissions.assertOrganizationMember(userId, organizationId);
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
    const track = await this.songsRepository.findTrack(songId, trackId);
    if (!track) throw new NotFoundException('Pista no encontrada');
    return track;
  }

  async assertSongFileInSong(songId: string, songFileId: string) {
    const songFile = await this.songsRepository.findSongFile(songId, songFileId);
    if (!songFile) throw new NotFoundException('Archivo no encontrado');
    return songFile;
  }

  async assertLinkInSong(songId: string, linkId: string) {
    const link = await this.songsRepository.findLink(songId, linkId);
    if (!link) throw new NotFoundException('Enlace no encontrado');
    return link;
  }
}
