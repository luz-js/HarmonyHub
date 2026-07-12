import type { AccidentalPreference, ParsedKeySignature } from './chord.types';
import { FLAT_KEYS, FLAT_NOTES, NOTE_TO_INDEX, SHARP_KEYS, SHARP_NOTES } from './chord.constants';

const keyPattern = /^\s*([A-G](?:#|b)?)(?:\s*(m|minor|major|mayor|menor))?\s*$/i;

export function parseKeySignature(key: string): ParsedKeySignature | null {
  const match = keyPattern.exec(key || '');
  if (!match) return null;
  const root = normalizeKeyRoot(match[1]);
  if (NOTE_TO_INDEX[root] === undefined) return null;
  const suffix = (match[2] || '').toLowerCase();
  return { root, mode: suffix === 'm' || suffix === 'minor' || suffix === 'menor' ? 'MINOR' : 'MAJOR' };
}

export function normalizeKeyRoot(root: string) {
  return root.charAt(0).toUpperCase() + root.slice(1).replace('♯', '#').replace('♭', 'b');
}

export function formatKey(root: string, mode: 'MAJOR' | 'MINOR', preference: AccidentalPreference) {
  const index = NOTE_TO_INDEX[normalizeKeyRoot(root)];
  const normalizedIndex = ((index % 12) + 12) % 12;
  const note = preference === 'FLATS' ? FLAT_NOTES[normalizedIndex] : SHARP_NOTES[normalizedIndex];
  return mode === 'MINOR' ? `${note}m` : note;
}

export function getAccidentalPreferenceForKey(targetKey?: string, fallback: AccidentalPreference = 'SHARPS'): Exclude<AccidentalPreference, 'AUTO'> {
  if (!targetKey) return fallback === 'FLATS' ? 'FLATS' : 'SHARPS';
  const parsed = parseKeySignature(targetKey);
  if (!parsed) return fallback === 'FLATS' ? 'FLATS' : 'SHARPS';
  const normalized = formatKey(parsed.root, parsed.mode, parsed.root.includes('b') ? 'FLATS' : 'SHARPS');
  if (FLAT_KEYS.has(normalized)) return 'FLATS';
  if (SHARP_KEYS.has(normalized)) return 'SHARPS';
  return fallback === 'FLATS' ? 'FLATS' : 'SHARPS';
}

export function getSemitoneDistance(fromKey: string, toKey: string) {
  const from = parseKeySignature(fromKey);
  const to = parseKeySignature(toKey);
  if (!from || !to) return 0;
  let distance = NOTE_TO_INDEX[to.root] - NOTE_TO_INDEX[from.root];
  if (distance > 6) distance -= 12;
  if (distance < -6) distance += 12;
  return distance;
}
