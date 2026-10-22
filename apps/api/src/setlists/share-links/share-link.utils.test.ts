import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { publicLimits } from './public-request-limiter';
import {
  generateShareToken,
  hashShareToken,
  isShareLinkActive,
  looksLikeShareToken,
  sharedEventDate,
  sharedSongContent,
  shareLinkExpiresAt,
} from './share-link.utils';

const now = new Date('2026-10-22T12:00:00.000Z');
const DAY = 86_400_000;

test('el token tiene 256 bits al azar en base64url y no se repite', () => {
  const tokens = new Set(Array.from({ length: 200 }, generateShareToken));
  assert.equal(tokens.size, 200);
  for (const token of tokens) {
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(Buffer.from(token, 'base64url').length, 32);
    assert.ok(looksLikeShareToken(token));
  }
});

test('en la base va el hash (sha256), nunca el token', () => {
  const token = generateShareToken();
  const hash = hashShareToken(token);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(hash, token);
  assert.equal(hashShareToken(token), hash, 'el mismo token da el mismo hash');
  assert.notEqual(hashShareToken(generateShareToken()), hash);
});

test('tokens mal formados se descartan sin consultar la base', () => {
  for (const value of ['', 'abc', 'x'.repeat(42), 'x'.repeat(44), `${'x'.repeat(42)}!`, '../../api/songs']) assert.equal(looksLikeShareToken(value), false, value);
});

test('vencimiento: 7 dias, 30 dias o nunca', () => {
  assert.equal(shareLinkExpiresAt('7d', now)?.getTime(), now.getTime() + 7 * DAY);
  assert.equal(shareLinkExpiresAt('30d', now)?.getTime(), now.getTime() + 30 * DAY);
  assert.equal(shareLinkExpiresAt('never', now), null);
});

test('un enlace sirve si no esta revocado ni vencido', () => {
  assert.equal(isShareLinkActive({ revokedAt: null, expiresAt: null }, now), true);
  assert.equal(isShareLinkActive({ revokedAt: null, expiresAt: new Date(now.getTime() + 1) }, now), true);
  assert.equal(isShareLinkActive({ revokedAt: null, expiresAt: now }, now), false, 'vence justo al llegar la fecha');
  assert.equal(isShareLinkActive({ revokedAt: new Date(now.getTime() - 1), expiresAt: null }, now), false);
});

test('contenido publico: solo secciones y lineas, sin notas ni datos del editor', () => {
  const content = sharedSongContent({
    contentJson: {
      version: 1,
      sections: [
        { id: 'abc', type: 'VERSE', name: 'Verso 1', notes: 'NOTA PRIVADA', collapsed: true, lines: [{ id: 'l1', chords: 'G   D', lyrics: 'Sublime gracia', comment: 'x' }] },
        { id: 'def', type: 'CHORUS', name: '', chords: ['C', 'G'], lyrics: 'Coro viejo' },
      ],
    },
    lyrics: null,
    chords: null,
  });
  assert.deepEqual(content, {
    version: 1,
    sections: [
      { id: 's0', type: 'VERSE', name: 'Verso 1', order: 0, lines: [{ id: 's0l0', order: 0, chords: 'G   D', lyrics: 'Sublime gracia' }] },
      { id: 's1', type: 'CHORUS', name: 'Sección 2', order: 1, lines: [{ id: 's1l0', order: 0, chords: 'C   G', lyrics: 'Coro viejo' }] },
    ],
  });
  assert.ok(!JSON.stringify(content).includes('NOTA PRIVADA'));
});

test('contenido publico de versiones viejas (letra y acordes en texto) o vacias', () => {
  const legacy = sharedSongContent({ contentJson: null, lyrics: 'Linea 1\nLinea 2', chords: 'G\nD' });
  assert.deepEqual(legacy?.sections[0].lines.map((line) => [line.chords, line.lyrics]), [['G', 'Linea 1'], ['D', 'Linea 2']]);
  assert.equal(sharedSongContent({ contentJson: { sections: [] }, lyrics: ' ', chords: null }), null);
  assert.equal(sharedSongContent(null), null);
});

test('fecha del evento: el proximo, o el ultimo si ya pasaron todos', () => {
  const at = (days: number) => ({ startsAt: new Date(now.getTime() + days * DAY) });
  assert.equal(sharedEventDate([at(10), at(3), at(-5)], now)?.getTime(), at(3).startsAt.getTime());
  assert.equal(sharedEventDate([at(-20), at(-5)], now)?.getTime(), at(-5).startsAt.getTime());
  assert.equal(sharedEventDate([], now), null);
});

afterEach(() => {
  delete process.env.PUBLIC_SHARE_MAX_REQUESTS;
});

test('limite publico por ip: 60 en 10 minutos por defecto, configurable', () => {
  assert.deepEqual(publicLimits(), { maxAttempts: 60, windowMs: 600_000, blockMs: 600_000 });
  process.env.PUBLIC_SHARE_MAX_REQUESTS = '3';
  assert.equal(publicLimits().maxAttempts, 3);
  process.env.PUBLIC_SHARE_MAX_REQUESTS = 'cero';
  assert.equal(publicLimits().maxAttempts, 60);
});
