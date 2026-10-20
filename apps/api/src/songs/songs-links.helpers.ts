import { BadRequestException } from '@nestjs/common';
import { InvalidLinkUrlError, resolveSongLink } from './links/song-link.utils';

export function resolveLinkUrlOrThrow(rawUrl: string) {
  try {
    return resolveSongLink(rawUrl);
  } catch (error) {
    if (error instanceof InvalidLinkUrlError) throw new BadRequestException(error.message);
    throw error;
  }
}

export function buildYoutubeLinkCreateInput(youtubeUrl: string, userId: string) {
  try {
    const resolved = resolveSongLink(youtubeUrl);
    return {
      provider: resolved.provider,
      url: resolved.url,
      title: 'YouTube',
      isPrimary: true,
      externalId: resolved.externalId,
      embedUrl: resolved.embedUrl,
      thumbnailUrl: resolved.thumbnailUrl,
      createdById: userId,
      sortOrder: 0,
      active: true,
    };
  } catch {
    return undefined;
  }
}
