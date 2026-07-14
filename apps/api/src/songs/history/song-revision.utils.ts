import { createHash } from 'node:crypto';

/**
 * Estado musical editable de una SongVersion que se versiona en cada revision.
 * No incluye tracks/files/links/comentarios: esos tienen su propia auditoria
 * (SongActivity) y nunca se duplican dentro del historial de revisiones.
 */
export type SongVersionRevisionSnapshot = {
  name: string;
  key: string | null;
  bpm: number | null;
  durationSec: number | null;
  contentJson: unknown;
  structureJson: unknown;
  lyrics: string | null;
  chords: string | null;
  notes: string | null;
};

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, v]) => `${JSON.stringify(key)}:${stableStringify(v)}`).join(',')}}`;
}

/** Hash estable del snapshot musical, usado para deduplicar revisiones consecutivas identicas. */
export function calculateSongVersionRevisionHash(snapshot: SongVersionRevisionSnapshot): string {
  return createHash('sha256').update(stableStringify(snapshot)).digest('hex');
}

type ContentSectionLine = { id?: string; lyrics?: string; chords?: string };
type ContentSection = { id?: string; name?: string; lines?: ContentSectionLine[] };

function getSections(contentJson: unknown): ContentSection[] {
  if (!contentJson || typeof contentJson !== 'object') return [];
  const sections = (contentJson as { sections?: unknown }).sections;
  return Array.isArray(sections) ? (sections as ContentSection[]) : [];
}

export interface SongRevisionScalarChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface SongRevisionSectionChange {
  sectionId: string;
  sectionName: string;
  linesAdded: number;
  linesRemoved: number;
  lyricsChanged: boolean;
  chordsChanged: boolean;
}

export interface SongRevisionDiff {
  scalarChanges: SongRevisionScalarChange[];
  sectionsAdded: string[];
  sectionsRemoved: string[];
  sectionsChanged: SongRevisionSectionChange[];
}

const SCALAR_FIELDS = ['name', 'key', 'bpm', 'durationSec', 'notes'] as const;

/** Diff legible pensado para UI ("Tonalidad: D -> E"), no un diff de texto caracter por caracter. */
export function diffSongVersionRevisions(before: SongVersionRevisionSnapshot, after: SongVersionRevisionSnapshot): SongRevisionDiff {
  const scalarChanges: SongRevisionScalarChange[] = [];
  for (const field of SCALAR_FIELDS) {
    if (before[field] !== after[field]) {
      scalarChanges.push({ field, before: before[field], after: after[field] });
    }
  }

  const beforeSections = getSections(before.contentJson);
  const afterSections = getSections(after.contentJson);
  const beforeIds = new Set(beforeSections.map((section) => section.id).filter(Boolean));
  const afterIds = new Set(afterSections.map((section) => section.id).filter(Boolean));

  const sectionsAdded = afterSections.filter((section) => section.id && !beforeIds.has(section.id)).map((section) => section.id as string);
  const sectionsRemoved = beforeSections.filter((section) => section.id && !afterIds.has(section.id)).map((section) => section.id as string);

  const sectionsChanged: SongRevisionSectionChange[] = [];
  for (const afterSection of afterSections) {
    if (!afterSection.id) continue;
    const beforeSection = beforeSections.find((section) => section.id === afterSection.id);
    if (!beforeSection) continue;

    const beforeLines = beforeSection.lines || [];
    const afterLines = afterSection.lines || [];
    const beforeLineIds = new Set(beforeLines.map((line) => line.id).filter(Boolean));
    const afterLineIds = new Set(afterLines.map((line) => line.id).filter(Boolean));

    const linesAdded = afterLines.filter((line) => line.id && !beforeLineIds.has(line.id)).length;
    const linesRemoved = beforeLines.filter((line) => line.id && !afterLineIds.has(line.id)).length;

    const beforeLyrics = beforeLines.map((line) => line.lyrics || '').join('\n');
    const afterLyrics = afterLines.map((line) => line.lyrics || '').join('\n');
    const beforeChords = beforeLines.map((line) => line.chords || '').join('\n');
    const afterChords = afterLines.map((line) => line.chords || '').join('\n');

    const lyricsChanged = beforeLyrics !== afterLyrics;
    const chordsChanged = beforeChords !== afterChords;
    const nameChanged = beforeSection.name !== afterSection.name;

    if (linesAdded > 0 || linesRemoved > 0 || lyricsChanged || chordsChanged || nameChanged) {
      sectionsChanged.push({
        sectionId: afterSection.id,
        sectionName: afterSection.name || afterSection.id,
        linesAdded,
        linesRemoved,
        lyricsChanged,
        chordsChanged,
      });
    }
  }

  return { scalarChanges, sectionsAdded, sectionsRemoved, sectionsChanged };
}
