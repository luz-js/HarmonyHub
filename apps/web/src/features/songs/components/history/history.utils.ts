import type { SongActivityType, SongRevisionDiff } from '../../../../shared/types';

export function lowercaseFirst(value: string) {
  return value.length > 0 ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

export function formatActivityLine(actorName: string | undefined, summary: string) {
  return `${actorName || 'Alguien'} ${lowercaseFirst(summary)}`;
}

export function formatHistoryDate(value: string) {
  return new Date(value).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ACTIVITY_ICON_GROUP: Record<string, 'song' | 'version' | 'track' | 'link' | 'file' | 'note' | 'collab'> = {
  SONG_CREATED: 'song', SONG_UPDATED: 'song', SONG_ARCHIVED: 'song', FAVORITE_CHANGED: 'song',
  VERSION_CREATED: 'version', VERSION_UPDATED: 'version', VERSION_DELETED: 'version', VERSION_SET_DEFAULT: 'version', VERSION_TRANSPOSED: 'version', VERSION_RESTORED: 'version',
  TRACK_ADDED: 'track', TRACK_UPDATED: 'track', TRACK_DELETED: 'track', TRACK_SET_PRIMARY: 'track',
  LINK_ADDED: 'link', LINK_UPDATED: 'link', LINK_DELETED: 'link', LINK_SET_PRIMARY: 'link',
  FILE_ADDED: 'file', FILE_UPDATED: 'file', FILE_DELETED: 'file', FILE_SET_PRIMARY: 'file',
  NOTE_CREATED: 'note', NOTE_UPDATED: 'note', NOTE_ARCHIVED: 'note', NOTE_DELETED: 'note', NOTE_PINNED: 'note',
  THREAD_CREATED: 'collab', THREAD_RESOLVED: 'collab', THREAD_REOPENED: 'collab', COMMENT_ADDED: 'collab',
};

export function activityIconGroup(action: SongActivityType) {
  return ACTIVITY_ICON_GROUP[action] || 'song';
}

export const revisionSourceLabels: Record<string, string> = {
  MANUAL_SAVE: 'Guardado manual',
  TRANSPOSE: 'Transposición',
  RESTORE: 'Restauración',
  IMPORT: 'Importación',
  MIGRATION: 'Migración',
};

export function hasDiffChanges(diff: SongRevisionDiff) {
  return diff.scalarChanges.length > 0 || diff.sectionsAdded.length > 0 || diff.sectionsRemoved.length > 0 || diff.sectionsChanged.length > 0;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  key: 'Tonalidad',
  bpm: 'BPM',
  durationSec: 'Duración',
  notes: 'Notas',
};

export function diffFieldLabel(field: string) {
  return FIELD_LABELS[field] || field;
}
