import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildLinkMetadata,
  detectSongLinkProvider,
  extractSpotifyResource,
  extractVimeoVideoId,
  extractYouTubeVideoId,
  InvalidLinkUrlError,
  normalizeSongLinkUrl,
  parseHttpUrl,
  resolveSongLink,
} from './song-link.utils';

test('detectSongLinkProvider identifica proveedores conocidos con y sin www', () => {
  assert.equal(detectSongLinkProvider('https://www.youtube.com/watch?v=abc123'), 'YOUTUBE');
  assert.equal(detectSongLinkProvider('https://youtu.be/abc123'), 'YOUTUBE');
  assert.equal(detectSongLinkProvider('https://music.youtube.com/watch?v=abc123'), 'YOUTUBE');
  assert.equal(detectSongLinkProvider('https://open.spotify.com/track/abc'), 'SPOTIFY');
  assert.equal(detectSongLinkProvider('https://music.apple.com/us/album/x/123'), 'APPLE_MUSIC');
  assert.equal(detectSongLinkProvider('https://soundcloud.com/user/track'), 'SOUNDCLOUD');
  assert.equal(detectSongLinkProvider('https://player.vimeo.com/video/123'), 'VIMEO');
  assert.equal(detectSongLinkProvider('https://vimeo.com/123'), 'VIMEO');
  assert.equal(detectSongLinkProvider('https://artist.bandcamp.com/track/song'), 'BANDCAMP');
  assert.equal(detectSongLinkProvider('https://example.com/somepage'), 'WEBSITE');
});

test('extractYouTubeVideoId soporta las variantes de URL de YouTube', () => {
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/watch?v=VIDEO_ID123'), 'VIDEO_ID123');
  assert.equal(extractYouTubeVideoId('https://youtu.be/VIDEO_ID123'), 'VIDEO_ID123');
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/embed/VIDEO_ID123'), 'VIDEO_ID123');
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/shorts/VIDEO_ID123'), 'VIDEO_ID123');
  assert.equal(extractYouTubeVideoId('https://music.youtube.com/watch?v=VIDEO_ID123'), 'VIDEO_ID123');
  assert.equal(extractYouTubeVideoId('https://example.com/watch?v=VIDEO_ID123'), null);
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/'), null);
});

test('genera embed y thumbnail de YouTube', () => {
  const metadata = buildLinkMetadata('YOUTUBE', 'https://www.youtube.com/watch?v=abc123XYZ');
  assert.equal(metadata.externalId, 'abc123XYZ');
  assert.equal(metadata.embedUrl, 'https://www.youtube.com/embed/abc123XYZ');
  assert.equal(metadata.thumbnailUrl, 'https://img.youtube.com/vi/abc123XYZ/hqdefault.jpg');
});

test('extractSpotifyResource soporta track/album/playlist/episode', () => {
  assert.deepEqual(extractSpotifyResource('https://open.spotify.com/track/abc123'), { type: 'track', id: 'abc123' });
  assert.deepEqual(extractSpotifyResource('https://open.spotify.com/album/abc123?si=xyz'), { type: 'album', id: 'abc123' });
  assert.deepEqual(extractSpotifyResource('https://open.spotify.com/intl-es/playlist/abc123'), { type: 'playlist', id: 'abc123' });
  assert.equal(extractSpotifyResource('https://open.spotify.com/'), null);
  assert.equal(extractSpotifyResource('https://example.com/track/abc123'), null);
});

test('genera embed de Spotify', () => {
  const metadata = buildLinkMetadata('SPOTIFY', 'https://open.spotify.com/track/abc123');
  assert.equal(metadata.embedUrl, 'https://open.spotify.com/embed/track/abc123');
  assert.equal(metadata.externalId, 'track:abc123');
});

test('extractVimeoVideoId y su embed', () => {
  assert.equal(extractVimeoVideoId('https://vimeo.com/123456789'), '123456789');
  assert.equal(extractVimeoVideoId('https://player.vimeo.com/video/123456789'), '123456789');
  assert.equal(extractVimeoVideoId('https://example.com/123456789'), null);
  const metadata = buildLinkMetadata('VIMEO', 'https://vimeo.com/123456789');
  assert.equal(metadata.embedUrl, 'https://player.vimeo.com/video/123456789');
});

test('SoundCloud genera embed publico sin API key', () => {
  const metadata = buildLinkMetadata('SOUNDCLOUD', 'https://soundcloud.com/user/track');
  assert.ok(metadata.embedUrl?.startsWith('https://w.soundcloud.com/player/?url='));
  assert.ok(metadata.embedUrl?.includes(encodeURIComponent('https://soundcloud.com/user/track')));
});

test('Apple Music, Bandcamp y WEBSITE no generan embed (conservador)', () => {
  assert.deepEqual(buildLinkMetadata('APPLE_MUSIC', 'https://music.apple.com/us/album/x/1'), { externalId: null, embedUrl: null, thumbnailUrl: null });
  assert.deepEqual(buildLinkMetadata('WEBSITE', 'https://example.com'), { externalId: null, embedUrl: null, thumbnailUrl: null });
});

test('parseHttpUrl rechaza protocolos inseguros', () => {
  assert.throws(() => parseHttpUrl('javascript:alert(1)'), InvalidLinkUrlError);
  assert.throws(() => parseHttpUrl('data:text/html,<script>alert(1)</script>'), InvalidLinkUrlError);
  assert.throws(() => parseHttpUrl('file:///etc/passwd'), InvalidLinkUrlError);
  assert.throws(() => parseHttpUrl('ftp://example.com/file'), InvalidLinkUrlError);
  assert.throws(() => parseHttpUrl('not a url'), InvalidLinkUrlError);
  assert.doesNotThrow(() => parseHttpUrl('https://example.com'));
});

test('normalizeSongLinkUrl reescribe YouTube/Spotify a forma canonica sin tocar otros dominios', () => {
  assert.equal(normalizeSongLinkUrl('https://youtu.be/abc123XYZ?t=30', 'YOUTUBE'), 'https://www.youtube.com/watch?v=abc123XYZ');
  assert.equal(normalizeSongLinkUrl('https://open.spotify.com/track/abc123?si=xyz', 'SPOTIFY'), 'https://open.spotify.com/track/abc123');
  assert.equal(normalizeSongLinkUrl('https://example.com/page?utm_source=x', 'WEBSITE'), 'https://example.com/page?utm_source=x');
});

test('resolveSongLink integra validacion + deteccion + normalizacion + metadata', () => {
  const resolved = resolveSongLink('https://youtu.be/abc123XYZ');
  assert.equal(resolved.provider, 'YOUTUBE');
  assert.equal(resolved.url, 'https://www.youtube.com/watch?v=abc123XYZ');
  assert.equal(resolved.externalId, 'abc123XYZ');
  assert.ok(resolved.embedUrl);
  assert.ok(resolved.thumbnailUrl);
});
