import { Inject, Injectable } from '@nestjs/common';
import type { CreateSongLinkData, ReorderSongLinksData, SongLinkListQueryData, UpdateSongLinkData } from '@harmonyhub/contracts';
import { clean } from '../shared/object.utils';
import { SongActivityService } from './activity/song-activity.service';
import { resolveLinkUrlOrThrow } from './songs-links.helpers';
import { normalizeLinkResponse } from './songs.presenter';
import { SongsAccessService } from './songs-access.service';
import { SongsRepository } from './songs.repository';
import type { OrgMember } from '../permissions/current-membership.decorator';

@Injectable()
export class SongsLinksService {
  constructor(
    @Inject(SongsRepository) private readonly songsRepository: SongsRepository,
    @Inject(SongsAccessService) private readonly access: SongsAccessService,
    @Inject(SongActivityService) private readonly activity: SongActivityService,
  ) {}

  async links(member: OrgMember, songId: string, query: SongLinkListQueryData) {
    const { organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    const versionId = query.versionId ? query.versionId : undefined;
    if (versionId) await this.access.assertVersionInSong(songId, versionId);
    const links = await this.songsRepository.listLinks(songId, { versionId });
    return links.map((link) => normalizeLinkResponse(link));
  }

  async link(member: OrgMember, songId: string, linkId: string) {
    const { organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    const link = await this.access.assertLinkInSong(songId, linkId);
    return normalizeLinkResponse(link);
  }

  async createLink(member: OrgMember, songId: string, data: CreateSongLinkData) {
    const { userId, organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    const version = await this.access.assertVersionInSong(songId, data.versionId);
    const resolved = resolveLinkUrlOrThrow(data.url);
    const sortOrder = await this.songsRepository.nextLinkSortOrder(songId, version?.id || null);

    const created = await this.songsRepository.createLink({
      songId,
      versionId: version?.id,
      createdById: userId,
      provider: resolved.provider,
      url: resolved.url,
      title: data.title,
      externalId: resolved.externalId,
      embedUrl: resolved.embedUrl,
      thumbnailUrl: resolved.thumbnailUrl,
      isPrimary: data.isPrimary,
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

  async updateLink(member: OrgMember, songId: string, linkId: string, data: UpdateSongLinkData) {
    const { organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    await this.access.assertLinkInSong(songId, linkId);

    const version = data.versionId === undefined ? undefined : await this.access.assertVersionInSong(songId, data.versionId);
    const resolved = data.url === undefined ? null : resolveLinkUrlOrThrow(data.url);

    const updated = await this.songsRepository.updateLink(linkId, clean({
      versionId: data.versionId === undefined ? undefined : version?.id ?? null,
      title: data.title,
      isPrimary: data.isPrimary,
      active: data.active,
      sortOrder: data.sortOrder,
      provider: resolved?.provider,
      url: resolved?.url,
      externalId: resolved?.externalId,
      embedUrl: resolved?.embedUrl,
      thumbnailUrl: resolved?.thumbnailUrl,
    }));
    return normalizeLinkResponse(updated);
  }

  async deleteLink(member: OrgMember, songId: string, linkId: string) {
    const { userId, organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
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

  async setPrimaryLink(member: OrgMember, songId: string, linkId: string) {
    const { userId, organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
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

  async reorderLinks(member: OrgMember, songId: string, data: ReorderSongLinksData) {
    const { organizationId } = member;
    await this.access.assertSongInOrganization(organizationId, songId);
    const version = await this.access.assertVersionInSong(songId, data.versionId);
    const links = await this.songsRepository.reorderLinks(songId, version?.id || null, data.items);
    return links.map((link) => normalizeLinkResponse(link));
  }
}
