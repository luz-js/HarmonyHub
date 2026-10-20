import type { SongContent } from '../../types/song-content.types';
import { normalizeSongContent } from '../../utils/song-content.utils';
import type { TranspositionIntegrityResult, TranspositionOptions } from './chord.types';
import { collectUnrecognizedTokens, transposeChordLine } from './transpose-chord';
import { getAccidentalPreferenceForKey } from './key-signature';

export function transposeSongContent(content: SongContent, options: TranspositionOptions): SongContent {
  const normalized = normalizeSongContent(content);
  const preference = options.accidentalPreference === 'AUTO'
    ? getAccidentalPreferenceForKey(options.targetKey)
    : options.accidentalPreference;

  return {
    ...normalized,
    sections: normalized.sections.map((section) => ({
      ...section,
      chords: section.chords?.map((chord) => transposeChordLine(chord, options.semitones, preference, options.targetKey)),
      lines: section.lines.map((line) => ({
        ...line,
        chords: transposeChordLine(line.chords, options.semitones, preference, options.targetKey),
      })),
    })),
  };
}

export function getUnrecognizedTokensFromContent(content: SongContent) {
  return Array.from(new Set(normalizeSongContent(content).sections.flatMap((section) => [
    ...(section.chords || []).flatMap(collectUnrecognizedTokens),
    ...section.lines.flatMap((line) => collectUnrecognizedTokens(line.chords)),
  ])));
}

export function validateTranspositionIntegrity(before: SongContent, after: SongContent): TranspositionIntegrityResult {
  const source = normalizeSongContent(before);
  const target = normalizeSongContent(after);
  const errors: string[] = [];
  if (source.sections.length !== target.sections.length) errors.push('La cantidad de secciones cambió.');

  source.sections.forEach((section, sectionIndex) => {
    const nextSection = target.sections[sectionIndex];
    if (!nextSection) return;
    if (section.id !== nextSection.id) errors.push(`La sección ${section.name} cambió de id.`);
    if (section.order !== nextSection.order) errors.push(`La sección ${section.name} cambió de orden.`);
    if (section.lyrics !== nextSection.lyrics) errors.push(`La letra de ${section.name} cambió.`);
    if (section.lines.length !== nextSection.lines.length) errors.push(`La cantidad de líneas de ${section.name} cambió.`);
    section.lines.forEach((line, lineIndex) => {
      const nextLine = nextSection.lines[lineIndex];
      if (!nextLine) return;
      if (line.id !== nextLine.id) errors.push(`Una línea de ${section.name} cambió de id.`);
      if (line.order !== nextLine.order) errors.push(`Una línea de ${section.name} cambió de orden.`);
      if (line.lyrics !== nextLine.lyrics) errors.push(`Una letra de ${section.name} cambió.`);
    });
  });

  return { valid: errors.length === 0, errors };
}
