import type { SongFile, SongFileCategory } from '../../../../shared/types';
import { formatBytes } from '../tracks/track.utils';

export { formatBytes };

export const fileCategoryLabels: Record<SongFileCategory, string> = {
  LYRIC_PDF: 'Letra (PDF)',
  CHORD_CHART: 'Chart de acordes',
  SHEET_MUSIC: 'Partitura',
  LEAD_SHEET: 'Lead sheet',
  PIANO_SCORE: 'Partitura de piano',
  GUITAR_SCORE: 'Partitura de guitarra',
  BASS_SCORE: 'Partitura de bajo',
  DRUM_SCORE: 'Partitura de batería',
  VOCAL_SCORE: 'Partitura vocal',
  IMAGE: 'Imagen',
  DOCUMENT: 'Documento',
  PRESENTATION: 'Presentación',
  MIDI: 'MIDI',
  MUSIC_XML: 'MusicXML',
  VIDEO: 'Video',
  OTHER: 'Otro',
  AUDIO: 'Audio (legacy)',
  STEM: 'Stem (legacy)',
  BACKING_TRACK: 'Backing (legacy)',
};

/** Categorias ofrecidas para archivos nuevos. Las legacy (AUDIO/STEM/BACKING_TRACK) solo se muestran en filas existentes. */
export const SELECTABLE_FILE_CATEGORIES: SongFileCategory[] = [
  'LYRIC_PDF', 'CHORD_CHART', 'SHEET_MUSIC', 'LEAD_SHEET', 'PIANO_SCORE', 'GUITAR_SCORE',
  'BASS_SCORE', 'DRUM_SCORE', 'VOCAL_SCORE', 'IMAGE', 'DOCUMENT', 'PRESENTATION', 'MIDI',
  'MUSIC_XML', 'VIDEO', 'OTHER',
];

const FILTER_GROUPS: Record<string, SongFileCategory[]> = {
  letras: ['LYRIC_PDF'],
  acordes: ['CHORD_CHART', 'LEAD_SHEET'],
  partituras: ['SHEET_MUSIC', 'PIANO_SCORE', 'GUITAR_SCORE', 'BASS_SCORE', 'DRUM_SCORE', 'VOCAL_SCORE'],
  imagenes: ['IMAGE'],
  documentos: ['DOCUMENT', 'PRESENTATION'],
  midi: ['MIDI', 'MUSIC_XML'],
};

export type FileFilter = 'all' | keyof typeof FILTER_GROUPS | 'otros';

export const FILE_FILTER_OPTIONS: Array<[FileFilter, string]> = [
  ['all', 'Todos'],
  ['letras', 'Letras'],
  ['acordes', 'Acordes'],
  ['partituras', 'Partituras'],
  ['imagenes', 'Imágenes'],
  ['documentos', 'Documentos'],
  ['midi', 'MIDI / MusicXML'],
  ['otros', 'Otros'],
];

const KNOWN_FILTER_CATEGORIES = new Set(Object.values(FILTER_GROUPS).flat());

export function filterSongFiles(files: SongFile[], filter: FileFilter) {
  if (filter === 'all') return files;
  if (filter === 'otros') return files.filter((file) => !KNOWN_FILTER_CATEGORIES.has(file.category));
  return files.filter((file) => FILTER_GROUPS[filter]?.includes(file.category));
}

/** Sugerencia preliminar de categoria; el usuario siempre puede cambiarla antes de subir. */
export function inferCategoryFromFile(file: File): SongFileCategory {
  const mime = file.type.toLowerCase();
  const extension = (file.name.split('.').pop() || '').toLowerCase();

  if (mime === 'application/pdf') return 'SHEET_MUSIC';
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime === 'audio/midi' || mime === 'audio/x-midi' || extension === 'mid' || extension === 'midi') return 'MIDI';
  if (mime.includes('musicxml') || extension === 'musicxml' || extension === 'xml') return 'MUSIC_XML';
  if (mime.includes('presentation') || extension === 'ppt' || extension === 'pptx') return 'PRESENTATION';
  if (mime.includes('word') || mime === 'text/plain' || mime === 'text/markdown' || mime.includes('opendocument.text') || ['doc', 'docx', 'odt', 'txt', 'md'].includes(extension)) return 'DOCUMENT';
  return 'OTHER';
}

export function getFileExtension(name: string) {
  const match = name.match(/\.([^.]+)$/);
  return match ? match[1].toUpperCase() : '';
}

export function isPdfFile(mimeType?: string | null) {
  return mimeType === 'application/pdf';
}

export function isImageFile(mimeType?: string | null) {
  return Boolean(mimeType && mimeType.startsWith('image/'));
}

export function normalizeFileOrder(files: SongFile[]) {
  return files
    .slice()
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    })
    .map((file, index) => ({ ...file, sortOrder: index }));
}

export function groupFilesByVersion(files: SongFile[], activeVersionId?: string | null) {
  return {
    versionFiles: normalizeFileOrder(files.filter((file) => file.versionId === activeVersionId)),
    generalFiles: normalizeFileOrder(files.filter((file) => file.versionId === null)),
    otherVersionFiles: normalizeFileOrder(files.filter((file) => file.versionId !== null && file.versionId !== activeVersionId)),
  };
}
