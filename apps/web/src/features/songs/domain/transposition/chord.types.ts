export type AccidentalPreference = 'SHARPS' | 'FLATS' | 'AUTO';

export type MusicalNote =
  | 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E' | 'F' | 'F#' | 'Gb'
  | 'G' | 'G#' | 'Ab' | 'A' | 'A#' | 'Bb' | 'B';

export interface ParsedChord {
  original: string;
  root: string;
  quality: string;
  bass?: string;
  valid: boolean;
}

export interface TranspositionOptions {
  semitones: number;
  accidentalPreference: AccidentalPreference;
  targetKey?: string;
}

export interface TranspositionResult {
  value: string;
  changed: boolean;
  valid: boolean;
  unrecognizedTokens?: string[];
}

export interface ParsedKeySignature {
  root: string;
  mode: 'MAJOR' | 'MINOR';
}

export interface TranspositionIntegrityResult {
  valid: boolean;
  errors: string[];
}
