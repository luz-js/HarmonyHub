import type { AccidentalPreference } from './chord.types';
import { FLAT_NOTES, NOTE_TO_INDEX, SHARP_NOTES } from './chord.constants';
import { getAccidentalPreferenceForKey } from './key-signature';

export function normalizeNote(note: string): number | null {
  const normalized = note.charAt(0).toUpperCase() + note.slice(1).replace('♯', '#').replace('♭', 'b');
  return NOTE_TO_INDEX[normalized] ?? null;
}

export function formatNote(chromaticIndex: number, preference: AccidentalPreference, targetKey?: string) {
  const index = ((chromaticIndex % 12) + 12) % 12;
  const resolved = preference === 'AUTO' ? getAccidentalPreferenceForKey(targetKey) : preference;
  return resolved === 'FLATS' ? FLAT_NOTES[index] : SHARP_NOTES[index];
}

export function transposeNote(note: string, semitones: number, preference: AccidentalPreference, targetKey?: string) {
  const index = normalizeNote(note);
  if (index === null) return note;
  return formatNote(index + semitones, preference, targetKey);
}
