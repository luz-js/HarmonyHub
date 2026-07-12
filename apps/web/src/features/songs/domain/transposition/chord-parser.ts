import type { ParsedChord } from './chord.types';
import { NON_CHORD_TOKENS, NOTE_TO_INDEX } from './chord.constants';

const chordPattern = /^([A-G](?:#|b)?)([^/\s|]*)(?:\/([A-G](?:#|b)?))?$/;
const safeQualityPattern = /^(?:m|min|maj|dim|aug|sus|add|no|[0-9]|#|b|\(|\)|\+|-)*$/i;

function normalizeRoot(root: string) {
  return root.charAt(0).toUpperCase() + root.slice(1).replace('♯', '#').replace('♭', 'b');
}

export function parseChord(value: string): ParsedChord {
  const original = value;
  const trimmed = value.trim();
  if (!trimmed || NON_CHORD_TOKENS.has(trimmed) || /^x\d+$/i.test(trimmed)) {
    return { original, root: '', quality: '', valid: false };
  }

  const match = chordPattern.exec(trimmed);
  if (!match) return { original, root: '', quality: '', valid: false };

  const root = normalizeRoot(match[1]);
  const quality = match[2] || '';
  const bass = match[3] ? normalizeRoot(match[3]) : undefined;
  if (NOTE_TO_INDEX[root] === undefined || (bass && NOTE_TO_INDEX[bass] === undefined)) {
    return { original, root, quality, bass, valid: false };
  }
  if (quality && !safeQualityPattern.test(quality)) {
    return { original, root, quality, bass, valid: false };
  }

  return { original, root, quality, bass, valid: true };
}
