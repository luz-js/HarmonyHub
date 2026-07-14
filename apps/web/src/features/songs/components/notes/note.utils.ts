import type { SongNote, SongNoteVisibility } from '../../../../shared/types';

export const noteVisibilityLabels: Record<SongNoteVisibility, string> = {
  PRIVATE: 'Privada',
  ORGANIZATION: 'Organización',
  LEADERS_ONLY: 'Líderes',
};

export function getCurrentUser(): { id?: string; role?: string } {
  try {
    return JSON.parse(localStorage.getItem('hh_user') || '{}');
  } catch {
    return {};
  }
}

/** Opciones de visibilidad ofrecidas al crear/editar segun el rol (el backend es la fuente de verdad, esto solo evita mostrar opciones inutiles). */
export function visibilityOptionsForRole(role?: string): SongNoteVisibility[] {
  if (role === 'GUEST') return [];
  if (role === 'OWNER' || role === 'ADMIN' || role === 'LEADER') return ['PRIVATE', 'ORGANIZATION', 'LEADERS_ONLY'];
  return ['PRIVATE', 'ORGANIZATION'];
}

export type NoteFilter = 'all' | 'ORGANIZATION' | 'LEADERS_ONLY' | 'PRIVATE' | 'pinned' | 'archived';

export const NOTE_FILTER_OPTIONS: Array<[NoteFilter, string]> = [
  ['all', 'Todas'],
  ['ORGANIZATION', 'Organización'],
  ['LEADERS_ONLY', 'Líderes'],
  ['PRIVATE', 'Privadas'],
  ['pinned', 'Fijadas'],
  ['archived', 'Archivadas'],
];

export function filterNotes(notes: SongNote[], filter: NoteFilter) {
  switch (filter) {
    case 'ORGANIZATION':
      return notes.filter((note) => note.visibility === 'ORGANIZATION' && !note.isArchived);
    case 'LEADERS_ONLY':
      return notes.filter((note) => note.visibility === 'LEADERS_ONLY' && !note.isArchived);
    case 'PRIVATE':
      return notes.filter((note) => note.visibility === 'PRIVATE' && !note.isArchived);
    case 'pinned':
      return notes.filter((note) => note.isPinned && !note.isArchived);
    case 'archived':
      return notes.filter((note) => note.isArchived);
    case 'all':
    default:
      return notes.filter((note) => !note.isArchived);
  }
}

export function groupNotes(notes: SongNote[], activeVersionId: string | null, currentUserId?: string) {
  const rest = notes.filter((note) => !note.isPinned);
  return {
    pinned: notes.filter((note) => note.isPinned),
    versionNotes: rest.filter((note) => note.versionId !== null && note.versionId === activeVersionId && note.visibility !== 'PRIVATE'),
    generalNotes: rest.filter((note) => note.versionId === null && note.visibility !== 'PRIVATE'),
    privateNotes: rest.filter((note) => note.visibility === 'PRIVATE' && note.author?.id === currentUserId),
  };
}
