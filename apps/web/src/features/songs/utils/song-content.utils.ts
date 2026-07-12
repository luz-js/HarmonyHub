import type { SongContent, SongLine, SongSection, SongSectionType, SongStructure } from '../types/song-content.types';
import { SongContentSchema } from '../schemas/song-content.schema';

const labels: Record<SongSectionType, string> = {
  INTRO: 'Intro',
  VERSE: 'Verso',
  PRE_CHORUS: 'Precoro',
  CHORUS: 'Coro',
  BRIDGE: 'Puente',
  INTERLUDE: 'Interludio',
  INSTRUMENTAL: 'Instrumental',
  SOLO: 'Solo',
  ENDING: 'Final',
  CUSTOM: 'Personalizada',
};

export const sectionTypeLabels = labels;

function makeId(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

export function createEmptySongContent(): SongContent {
  return { version: 1, sections: [] };
}

export function createLine(input: Partial<SongLine> = {}): SongLine {
  return {
    id: input.id || makeId('line'),
    order: input.order ?? 0,
    chords: input.chords ?? '',
    lyrics: input.lyrics ?? '',
  };
}

export function getNextSectionName(type: SongSectionType, sections: SongSection[]) {
  const base = labels[type];
  const sameTypeCount = sections.filter((section) => section.type === type).length;
  if (type === 'CHORUS' && sameTypeCount === 0) return base;
  if (['INTRO', 'PRE_CHORUS', 'BRIDGE', 'INTERLUDE', 'INSTRUMENTAL', 'SOLO', 'ENDING', 'CUSTOM'].includes(type) && sameTypeCount === 0) return base;
  return `${base} ${sameTypeCount + 1}`;
}

export function createSection(type: SongSectionType, name?: string, existingSections: SongSection[] = []): SongSection {
  return {
    id: makeId(`section-${type.toLowerCase().replace(/_/g, '-')}`),
    type,
    name: name || getNextSectionName(type, existingSections),
    order: existingSections.length,
    chords: [],
    lyrics: '',
    notes: '',
    lines: type === 'INTRO' || type === 'INSTRUMENTAL' || type === 'INTERLUDE' || type === 'SOLO' ? [] : [createLine()],
  };
}

export function reorderSections(sections: SongSection[]) {
  return sections.map((section, order) => ({ ...section, order }));
}

export function reorderLines(lines: SongLine[]) {
  return lines.map((line, order) => ({ ...line, order }));
}

export function normalizeSongContent(content: unknown): SongContent {
  const parsed = SongContentSchema.safeParse(content);
  if (parsed.success) {
    return { version: 1, sections: reorderSections(parsed.data.sections).map((section) => ({ ...section, lines: reorderLines(section.lines || []) })) };
  }

  const candidate = content as { sections?: Array<any> } | null | undefined;
  if (!candidate?.sections || !Array.isArray(candidate.sections)) return createEmptySongContent();

  return {
    version: 1,
    sections: reorderSections(candidate.sections.map((section, index) => ({
      id: String(section.id || makeId('section')),
      type: labels[section.type as SongSectionType] ? section.type : 'CUSTOM',
      name: String(section.name || `Seccion ${index + 1}`),
      order: index,
      chords: Array.isArray(section.chords) ? section.chords.map(String) : [],
      lyrics: typeof section.lyrics === 'string' ? section.lyrics : '',
      notes: typeof section.notes === 'string' ? section.notes : '',
      collapsed: Boolean(section.collapsed),
      lines: reorderLines((Array.isArray(section.lines) && section.lines.length ? section.lines : [{ chords: (section.chords || []).join('   '), lyrics: section.lyrics || '' }]).map((line: any, lineIndex: number) => createLine({
        id: String(line.id || makeId('line')),
        order: lineIndex,
        chords: String(line.chords || ''),
        lyrics: String(line.lyrics || ''),
      }))),
    }))),
  };
}

export function duplicateSection(section: SongSection): SongSection {
  return {
    ...section,
    id: makeId('section-copy'),
    name: `${section.name} copia`,
    lines: section.lines.map((line) => ({ ...line, id: makeId('line-copy') })),
    collapsed: false,
  };
}

export function contentToPlainLyrics(content: SongContent) {
  return normalizeSongContent(content).sections.flatMap((section) => section.lines.map((line) => line.lyrics)).join('\n');
}

export function contentToPlainChords(content: SongContent) {
  return normalizeSongContent(content).sections.flatMap((section) => section.lines.map((line) => line.chords)).join('\n');
}

export function legacyFieldsToSongContent(lyrics?: string | null, chords?: string | null): SongContent {
  const lyricLines = (lyrics || '').split(/\r?\n/);
  const chordLines = (chords || '').split(/\r?\n/);
  const total = Math.max(lyricLines.length, chordLines.length, 1);
  return {
    version: 1,
    sections: [
      {
        id: makeId('section-verse'),
        type: 'VERSE',
        name: 'Verso 1',
        order: 0,
        chords: [],
        lyrics: '',
        notes: '',
        lines: Array.from({ length: total }, (_, index) => createLine({ order: index, chords: chordLines[index] || '', lyrics: lyricLines[index] || '' })),
      },
    ],
  };
}

export function deriveStructureJson(content: SongContent): SongStructure {
  const normalized = normalizeSongContent(content);
  return {
    version: 1,
    order: normalized.sections.map((section) => section.id),
    sections: normalized.sections.map(({ id, type, name, order }) => ({ id, type, name, order })),
  };
}

export function moveItem<T>(items: T[], index: number, direction: 'UP' | 'DOWN') {
  const nextIndex = direction === 'UP' ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}
