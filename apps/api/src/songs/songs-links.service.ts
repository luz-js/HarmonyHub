import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { clean } from '../shared/object.utils';
import { SongActivityService } from './activity/song-activity.service';
import { resolveLinkUrlOrThrow } from './songs-links.helpers';
import { normalizeLinkResponse } from './songs.presenter';
import { createLinkSchema, listLinkQuerySchema, reorderLinksSchema, updateLinkSchema } from './songs.schemas';
import { SongsAccessService } from './songs-access.service';
import { SongsRepository } from './songs.repository';

@Injectable()
export class SongsLinksService {
  constructor(
    @Inject(SongsRepository) private readonly songsRepository: SongsRepository,
    @Inject(SongsAccessService) private readonly access: SongsAccessService,
    @Inject(SongActivityService) private readonly activity: SongActivityService,
  ) {}

  async links(userId: string, organizationId: string, songId: string, query: Record<string, unknown> = {}) {
    await this.access.assertSongInOrganization(userId, organizationId, songId);
    const parsed = listLinkQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const versionId = parsed.data.versionId ? parsed.data.versionId : undefined;
    if (versionId) await this.access.assertVersionInSong(songId, versionId);
    const links = await this.songsRepository.listLinks(songId, { versionId });
    return links.map((link) => normalizeLinkResponse(link));
  }

  async link(userId: string, organizationId: string, songId: string, linkId: string) {
    await this.access.assertSongInOrganization(userId, organizationId, songId);
    const link = await this.access.assertLinkInSong(songId, linkId);
    return normalizeLinkResponse(link);
  }

  async createLink(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const parsed = createLinkSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = await this.access.assertVersionInSong(songId, parsed.data.versionId);
    const resolved = resolveLinkUrlOrThrow(parsed.data.url);
    const sortOrder = await this.songsRepository.nextLinkSortOrder(songId, version?.id || null);

    const created = await this.songsRepository.createLink({
      songId,
      versionId: version?.id,
      createdById: userId,
      provider: resolved.provider,
      url: resolved.url,
      title: parsed.data.title,
      externalId: resolved.externalId,
      embedUrl: resolved.embedUrl,
      thumbnailUrl: resolved.thumbnailUrl,
      isPrimary: parsed.data.isPrimary,
      sortOrder,
      active: true,
    });
    await this.activity.recordBestEffort({
      songId,
      versionId: version?.id ?? null,
      organizationId,
      actorId: userId,
      action: 'LINK_ADDED',
      entityType: 'LINK',
      entityId: created.id,
      summary: `Agregó el enlace "${created.title || created.url}"`,
      metadata: { provider: created.provider },
    });
    return normalizeLinkResponse(created);
  }

  async updateLink(userId: string, organizationId: string, songId: string, linkId: string, input: Record<string, unknown>) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    await this.access.assertLinkInSong(songId, linkId);
    const parsed = updateLinkSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');

    const version = parsed.data.versionId === undefined ? undefined : await this.access.assertVersionInSong(songId, parsed.data.versionId);
    const resolved = parsed.data.url === undefined ? null : resolveLinkUrlOrThrow(parsed.data.url);

    const updated = await this.songsRepository.updateLink(linkId, clean({
      versionId: parsed.data.versionId === undefined ? undefined : version?.id ?? null,
      title: parsed.data.title,
      isPrimary: parsed.data.isPrimary,
      active: parsed.data.active,
      sortOrder: parsed.data.sortOrder,
      provider: resolved?.provider,
      url: resolved?.url,
      externalId: resolved?.externalId,
      embedUrl: resolved?.embedUrl,
      thumbnailUrl: resolved?.thumbnailUrl,
    }));
    return normalizeLinkResponse(updated);
  }

  async deleteLink(userId: string, organizationId: string, songId: string, linkId: string) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const link = await this.access.assertLinkInSong(songId, linkId);
    await this.songsRepository.deleteLink(linkId);
    await this.activity.recordBestEffort({
      songId,
      versionId: link.versionId,
      organizationId,
      actorId: userId,
      action: 'LINK_DELETED',
      entityType: 'LINK',
      entityId: linkId,
      summary: `Eliminó el enlace "${link.title || link.url}"`,
    });
    return { ok: true };
  }

  async setPrimaryLink(userId: string, organizationId: string, songId: string, linkId: string) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    await this.access.assertLinkInSong(songId, linkId);
    const link = await this.songsRepository.setLinkPrimary(songId, linkId);
    await this.activity.recordBestEffort({
      songId,
      versionId: link.versionId,
      organizationId,
      actorId: userId,
      action: 'LINK_SET_PRIMARY',
      entityType: 'LINK',
      entityId: linkId,
      summary: `Marcó "${link.title || link.url}" como enlace principal`,
    });
    return normalizeLinkResponse(link);
  }

  async reorderLinks(userId: string, organizationId: string, songId: string, input: Record<string, unknown>) {
    await this.access.assertSongInOrganization(userId, organizationId, songId, 'songs.manage');
    const parsed = reorderLinksSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || 'Datos invalidos');
    const version = await this.access.assertVersionInSong(songId, parsed.data.versionId);
    const links = await this.songsRepository.reorderLinks(songId, version?.id || null, parsed.data.items);
    return links.map((link) => normalizeLinkResponse(link));
  }
}
