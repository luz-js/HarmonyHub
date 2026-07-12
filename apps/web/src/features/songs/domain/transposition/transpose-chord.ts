import type { AccidentalPreference, TranspositionResult } from './chord.types';
import { parseChord } from './chord-parser';
import { transposeNote } from './transpose-note';

const possibleChordPattern = /[A-G](?:#|b)?[A-Za-z0-9#b()+-]*(?:\/[A-G](?:#|b)?)?/g;

export function transposeChord(chord: string, semitones: number, preference: AccidentalPreference, targetKey?: string): TranspositionResult {
  const parsed = parseChord(chord);
  if (!parsed.valid) return { value: chord, changed: false, valid: false, unrecognizedTokens: chord.trim() ? [chord] : [] };
  const root = transposeNote(parsed.root, semitones, preference, targetKey);
  const bass = parsed.bass ? `/${transposeNote(parsed.bass, semitones, preference, targetKey)}` : '';
  return { value: `${root}${parsed.quality}${bass}`, changed: semitones !== 0, valid: true };
}

export function transposeChordLine(value: string, semitones: number, preference: AccidentalPreference, targetKey?: string) {
  return value.replace(possibleChordPattern, (token) => {
    const result = transposeChord(token, semitones, preference, targetKey);
    return result.valid ? result.value : token;
  });
}

export function collectUnrecognizedTokens(value: string) {
  const tokens: string[] = [];
  value.replace(possibleChordPattern, (token) => {
    if (!transposeChord(token, 0, 'SHARPS').valid) tokens.push(token);
    return token;
  });
  return tokens;
}
