import type { SongLink, SongLinkProvider } from '../../../../shared/types';

export const linkProviderLabels: Record<SongLinkProvider, string> = {
  YOUTUBE: 'YouTube',
  SPOTIFY: 'Spotify',
  APPLE_MUSIC: 'Apple Music',
  SOUNDCLOUD: 'SoundCloud',
  VIMEO: 'Vimeo',
  BANDCAMP: 'Bandcamp',
  WEBSITE: 'Sitio web',
  OTHER: 'Otro',
};

/**
 * Deteccion rapida en cliente solo para preview mientras el usuario escribe la
 * URL. La deteccion autoritativa (y la que persiste) siempre ocurre en el backend.
 */
export function detectProviderPreview(rawUrl: string): SongLinkProvider | null {
  let host: string;
  try {
    host = new URL(rawUrl.trim()).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }

  if (['youtube.com', 'youtu.be', 'music.youtube.com'].includes(host)) return 'YOUTUBE';
  if (['open.spotify.com', 'spotify.com'].includes(host)) return 'SPOTIFY';
  if (['music.apple.com', 'itunes.apple.com'].includes(host)) return 'APPLE_MUSIC';
  if (host === 'soundcloud.com') return 'SOUNDCLOUD';
  if (['vimeo.com', 'player.vimeo.com'].includes(host)) return 'VIMEO';
  if (host === 'bandcamp.com' || host.endsWith('.bandcamp.com')) return 'BANDCAMP';
  return 'WEBSITE';
}

const ALLOWED_EMBED_HOSTS = ['youtube.com', 'youtube-nocookie.com', 'spotify.com', 'apple.com', 'soundcloud.com', 'vimeo.com'];

/** Defensa en profundidad en el cliente: nunca montar un iframe fuera de la allowlist, aunque el backend ya valido la URL. */
export function isAllowedEmbedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_EMBED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

export type EmbedFrameConfig = {
  sandbox: string;
  allow: string;
};

const EMBED_CONFIG_BY_PROVIDER: Partial<Record<SongLinkProvider, EmbedFrameConfig>> = {
  YOUTUBE: { sandbox: 'allow-scripts allow-same-origin allow-presentation allow-popups', allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' },
  SPOTIFY: { sandbox: 'allow-scripts allow-same-origin allow-popups', allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture' },
  VIMEO: { sandbox: 'allow-scripts allow-same-origin allow-presentation allow-popups', allow: 'autoplay; fullscreen; picture-in-picture' },
  SOUNDCLOUD: { sandbox: 'allow-scripts allow-same-origin allow-popups', allow: 'autoplay' },
};

export function getEmbedFrameConfig(provider: SongLinkProvider): EmbedFrameConfig {
  return EMBED_CONFIG_BY_PROVIDER[provider] || { sandbox: 'allow-scripts allow-same-origin', allow: '' };
}

export function canEmbed(link: Pick<SongLink, 'provider' | 'embedUrl'>): boolean {
  return Boolean(link.embedUrl) && isAllowedEmbedUrl(link.embedUrl);
}

function bySortOrder(links: SongLink[]) {
  return links
    .slice()
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    });
}

export function normalizeLinkOrder(links: SongLink[]) {
  return bySortOrder(links).map((link, index) => ({ ...link, sortOrder: index }));
}

export function groupLinksByVersion(links: SongLink[], activeVersionId?: string | null) {
  return {
    versionLinks: normalizeLinkOrder(links.filter((link) => link.versionId === activeVersionId)),
    generalLinks: normalizeLinkOrder(links.filter((link) => link.versionId === null)),
    otherVersionLinks: normalizeLinkOrder(links.filter((link) => link.versionId !== null && link.versionId !== activeVersionId)),
  };
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
