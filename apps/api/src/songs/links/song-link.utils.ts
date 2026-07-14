import { SongLinkProvider } from '@prisma/client';

/**
 * Utilidades puras para validar URLs de referencias externas, detectar el
 * proveedor y derivar metadata embebible (externalId/embedUrl/thumbnailUrl).
 * No dependen de NestJS ni de Prisma en tiempo de ejecucion (solo del tipo
 * SongLinkProvider), por lo que son testeables de forma aislada.
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export class InvalidLinkUrlError extends Error {}

function hostname(parsed: URL) {
  return parsed.hostname.replace(/^www\./i, '').toLowerCase();
}

/** Parsea y valida que la URL use http/https. Rechaza javascript:, data:, file:, ftp:, etc. */
export function parseHttpUrl(rawUrl: string): URL {
  const trimmed = (rawUrl || '').trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new InvalidLinkUrlError('URL invalida');
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new InvalidLinkUrlError('Solo se permiten URLs http o https');
  }
  return parsed;
}

const YOUTUBE_HOSTS = new Set(['youtube.com', 'youtu.be', 'music.youtube.com']);
const SPOTIFY_HOSTS = new Set(['open.spotify.com', 'spotify.com']);
const APPLE_MUSIC_HOSTS = new Set(['music.apple.com', 'itunes.apple.com']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'player.vimeo.com']);

/** Detecta el proveedor a partir del dominio de la URL (con o sin "www."). */
export function detectSongLinkProvider(url: string): SongLinkProvider {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return 'OTHER';
  }
  const host = hostname(parsed);

  if (YOUTUBE_HOSTS.has(host)) return 'YOUTUBE';
  if (SPOTIFY_HOSTS.has(host)) return 'SPOTIFY';
  if (APPLE_MUSIC_HOSTS.has(host)) return 'APPLE_MUSIC';
  if (host === 'soundcloud.com') return 'SOUNDCLOUD';
  if (VIMEO_HOSTS.has(host)) return 'VIMEO';
  if (host === 'bandcamp.com' || host.endsWith('.bandcamp.com')) return 'BANDCAMP';
  return 'WEBSITE';
}

function isValidYouTubeId(id: string | null | undefined): id is string {
  return !!id && /^[\w-]{6,20}$/.test(id);
}

/**
 * Soporta: watch?v=ID, youtu.be/ID, /embed/ID, /shorts/ID y
 * music.youtube.com/watch?v=ID.
 */
export function extractYouTubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  const host = hostname(parsed);
  if (!YOUTUBE_HOSTS.has(host)) return null;

  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    return isValidYouTubeId(id) ? id : null;
  }

  if (parsed.pathname === '/watch') {
    const id = parsed.searchParams.get('v');
    return isValidYouTubeId(id) ? id : null;
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if ((segments[0] === 'embed' || segments[0] === 'shorts') && isValidYouTubeId(segments[1])) {
    return segments[1];
  }

  return null;
}

export function buildYouTubeEmbed(videoId: string) {
  return {
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
}

const SPOTIFY_RESOURCE_TYPES = new Set(['track', 'album', 'playlist', 'episode', 'show']);
export type SpotifyResourceType = 'track' | 'album' | 'playlist' | 'episode' | 'show';

/** Soporta URLs con segmentos de locale opcionales, p.ej. /intl-es/track/ID. */
export function extractSpotifyResource(url: string): { type: SpotifyResourceType; id: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  const host = hostname(parsed);
  if (!SPOTIFY_HOSTS.has(host)) return null;

  const segments = parsed.pathname.split('/').filter(Boolean);
  const typeIndex = segments.findIndex((segment) => SPOTIFY_RESOURCE_TYPES.has(segment));
  const id = typeIndex >= 0 ? segments[typeIndex + 1] : undefined;
  if (typeIndex < 0 || !id || !/^[A-Za-z0-9]+$/.test(id)) return null;

  return { type: segments[typeIndex] as SpotifyResourceType, id };
}

export function buildSpotifyEmbed(resource: { type: SpotifyResourceType; id: string }) {
  return { embedUrl: `https://open.spotify.com/embed/${resource.type}/${resource.id}` };
}

export function extractVimeoVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  const host = hostname(parsed);
  if (!VIMEO_HOSTS.has(host)) return null;

  const segments = parsed.pathname.split('/').filter(Boolean);
  const id = segments.find((segment) => /^\d+$/.test(segment));
  return id || null;
}

export function buildVimeoEmbed(videoId: string) {
  return { embedUrl: `https://player.vimeo.com/video/${videoId}` };
}

/**
 * SoundCloud no requiere API key para un embed publico: el widget acepta la
 * URL original codificada como parametro.
 */
export function buildSoundCloudEmbed(originalUrl: string) {
  return { embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(originalUrl)}&color=%2300e6a3&auto_play=false&visual=false` };
}

/**
 * Reescribe la URL a una forma canonica solo para YouTube/Spotify (donde se
 * puede derivar el recurso de forma segura). Para el resto de proveedores no
 * se modifica la URL original.
 */
export function normalizeSongLinkUrl(rawUrl: string, provider: SongLinkProvider): string {
  const trimmed = rawUrl.trim();

  if (provider === 'YOUTUBE') {
    const id = extractYouTubeVideoId(trimmed);
    if (id) return `https://www.youtube.com/watch?v=${id}`;
  }

  if (provider === 'SPOTIFY') {
    const resource = extractSpotifyResource(trimmed);
    if (resource) return `https://open.spotify.com/${resource.type}/${resource.id}`;
  }

  return trimmed;
}

export type SongLinkMetadata = {
  externalId: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
};

/** Deriva externalId/embedUrl/thumbnailUrl segun el proveedor. Conservador: sin metadata si no se puede derivar de forma segura. */
export function buildLinkMetadata(provider: SongLinkProvider, url: string): SongLinkMetadata {
  if (provider === 'YOUTUBE') {
    const id = extractYouTubeVideoId(url);
    if (!id) return { externalId: null, embedUrl: null, thumbnailUrl: null };
    const embed = buildYouTubeEmbed(id);
    return { externalId: id, embedUrl: embed.embedUrl, thumbnailUrl: embed.thumbnailUrl };
  }

  if (provider === 'SPOTIFY') {
    const resource = extractSpotifyResource(url);
    if (!resource) return { externalId: null, embedUrl: null, thumbnailUrl: null };
    return { externalId: `${resource.type}:${resource.id}`, embedUrl: buildSpotifyEmbed(resource).embedUrl, thumbnailUrl: null };
  }

  if (provider === 'VIMEO') {
    const id = extractVimeoVideoId(url);
    if (!id) return { externalId: null, embedUrl: null, thumbnailUrl: null };
    return { externalId: id, embedUrl: buildVimeoEmbed(id).embedUrl, thumbnailUrl: null };
  }

  if (provider === 'SOUNDCLOUD') {
    return { externalId: null, embedUrl: buildSoundCloudEmbed(url).embedUrl, thumbnailUrl: null };
  }

  // APPLE_MUSIC, BANDCAMP, WEBSITE, OTHER: sin embed seguro conocido en esta fase.
  return { externalId: null, embedUrl: null, thumbnailUrl: null };
}

export type ResolvedSongLink = SongLinkMetadata & {
  provider: SongLinkProvider;
  url: string;
};

/** Punto de entrada unico: valida, detecta proveedor, normaliza URL y deriva metadata. */
export function resolveSongLink(rawUrl: string): ResolvedSongLink {
  const parsed = parseHttpUrl(rawUrl);
  const provider = detectSongLinkProvider(parsed.toString());
  const url = normalizeSongLinkUrl(parsed.toString(), provider);
  const metadata = buildLinkMetadata(provider, url);
  return { provider, url, ...metadata };
}
