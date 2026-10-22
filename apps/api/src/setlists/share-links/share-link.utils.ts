import { createHash, randomBytes } from 'node:crypto';
import type { SharedSongContent, ShareLinkDuration } from '@harmonyhub/contracts';

/** 32 bytes al azar (256 bits) en base64url: 43 caracteres que se pueden poner en una URL tal cual. */
export const SHARE_TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const DAY_MS = 24 * 60 * 60 * 1000;
const DURATION_MS: Record<ShareLinkDuration, number | null> = { '7d': 7 * DAY_MS, '30d': 30 * DAY_MS, never: null };

export function generateShareToken() {
  return randomBytes(SHARE_TOKEN_BYTES).toString('base64url');
}

/** En la base solo se guarda esto: con la base en la mano no se puede armar el enlace. */
export function hashShareToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/** Descarta de entrada lo que no puede ser un token (sin consultar la base). */
export function looksLikeShareToken(value: string) {
  return TOKEN_PATTERN.test(value);
}

export function shareLinkExpiresAt(duration: ShareLinkDuration, now: Date) {
  const ms = DURATION_MS[duration];
  return ms === null ? null : new Date(now.getTime() + ms);
}

/** Un enlace sirve si no fue revocado y no vencio. */
export function isShareLinkActive(link: { revokedAt: Date | null; expiresAt: Date | null }, now: Date) {
  return !link.revokedAt && (!link.expiresAt || link.expiresAt.getTime() > now.getTime());
}

type RawSection = { id?: unknown; type?: unknown; name?: unknown; chords?: unknown; lyrics?: unknown; lines?: unknown };
type RawLine = { id?: unknown; chords?: unknown; lyrics?: unknown };

const text = (value: unknown) => (typeof value === 'string' ? value : '');

/**
 * Letra y acordes para la pagina publica: solo nombre de cada seccion y sus lineas. Todo lo demas que pueda traer
 * contentJson (notas de seccion, datos del editor) se queda afuera. Sin contentJson se arma con los campos viejos.
 */
export function sharedSongContent(version: { contentJson: unknown; lyrics: string | null; chords: string | null } | null): SharedSongContent | null {
  if (!version) return null;
  const raw = version.contentJson as { sections?: unknown } | null;
  if (raw && Array.isArray(raw.sections) && raw.sections.length > 0) {
    return {
      version: 1,
      sections: (raw.sections as RawSection[]).map((section, index) => {
        const lines = Array.isArray(section.lines) && section.lines.length > 0
          ? (section.lines as RawLine[]).map((line) => ({ chords: text(line.chords), lyrics: text(line.lyrics) }))
          : [{ chords: Array.isArray(section.chords) ? section.chords.map(String).join('   ') : '', lyrics: text(section.lyrics) }];
        return {
          id: `s${index}`,
          type: text(section.type) || 'CUSTOM',
          name: text(section.name) || `Sección ${index + 1}`,
          order: index,
          lines: lines.map((line, lineIndex) => ({ id: `s${index}l${lineIndex}`, order: lineIndex, ...line })),
        };
      }),
    };
  }
  if (!version.lyrics?.trim() && !version.chords?.trim()) return null;
  const lyricLines = (version.lyrics || '').split(/\r?\n/);
  const chordLines = (version.chords || '').split(/\r?\n/);
  const total = Math.max(lyricLines.length, chordLines.length);
  return {
    version: 1,
    sections: [
      {
        id: 's0',
        type: 'VERSE',
        name: 'Letra',
        order: 0,
        lines: Array.from({ length: total }, (_, index) => ({ id: `s0l${index}`, order: index, chords: chordLines[index] || '', lyrics: lyricLines[index] || '' })),
      },
    ],
  };
}

/** La fecha del evento que usa el setlist: el proximo; si ya pasaron todos, el ultimo. */
export function sharedEventDate(events: Array<{ startsAt: Date }>, now: Date) {
  const sorted = [...events].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const upcoming = sorted.find((event) => event.startsAt.getTime() >= now.getTime() - DAY_MS);
  return (upcoming ?? sorted.at(-1))?.startsAt ?? null;
}
