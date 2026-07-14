import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildStorageKey, sanitizeSegment, ensureWithinRoot } from './storage-path';

test('sanitizeSegment normaliza y limpia caracteres inseguros', () => {
  assert.equal(sanitizeSegment('Backing Track 01!'), 'backing-track-01');
  assert.equal(sanitizeSegment('a/b\\c'), 'a-b-c');
  assert.equal(sanitizeSegment('###'), 'track');
});

test('buildStorageKey mantiene la jerarquia logica org/cancion/version/pista', () => {
  const key = buildStorageKey(
    ['organizations', 'org_1', 'songs', 'song_1', 'versions', 'ver_1', 'tracks', 'track_1'],
    'Mi Pista Final.MP3',
  );
  assert.equal(key, 'organizations/org_1/songs/song_1/versions/ver_1/tracks/track_1/mi-pista-final.mp3');
});

test('buildStorageKey usa siempre separadores "/" (compatibles con object stores)', () => {
  const key = buildStorageKey(['a', 'b'], 'x.wav');
  assert.ok(!key.includes('\\'));
  assert.equal(key, 'a/b/x.wav');
});

test('ensureWithinRoot bloquea rutas fuera del root (anti path traversal)', () => {
  assert.throws(() => ensureWithinRoot('/data/tracks', '/data/other/evil.mp3'));
  assert.doesNotThrow(() => ensureWithinRoot('/data/tracks', '/data/tracks/a/b.mp3'));
});
