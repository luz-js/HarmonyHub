import type { AssignmentPreparationStatus, SetlistItemType, SetlistMusicalRole, SetlistParticipantStatus } from '../../../../shared/types';

/**
 * Duplicado deliberado de `ROLES_BY_ITEM_TYPE` en `apps/api/src/setlists/assignments/setlist-assignment.utils.ts`:
 * solo filtra el selector en el frontend, el backend no lo usa para validar (acepta cualquier role del enum).
 */
export const ROLES_BY_ITEM_TYPE: Record<SetlistItemType, SetlistMusicalRole[]> = {
  SONG: [
    'MUSIC_DIRECTOR', 'BAND_LEADER', 'LEAD_VOCAL', 'BACKING_VOCAL', 'CHOIR',
    'ACOUSTIC_GUITAR', 'ELECTRIC_GUITAR', 'BASS', 'DRUMS', 'PERCUSSION', 'PIANO', 'KEYS', 'ORGAN', 'SYNTH', 'STRINGS', 'BRASS', 'WOODWIND', 'VIOLIN', 'CELLO',
    'TRACKS', 'CLICK', 'PAD',
    'AUDIO_ENGINEER', 'MONITOR_ENGINEER', 'OTHER',
  ],
  PRAYER: ['PRAYER_LEADER', 'MUSIC_DIRECTOR', 'OTHER'],
  SPEAKING: ['SPEAKER', 'OTHER'],
  ANNOUNCEMENT: ['ANNOUNCER', 'OTHER'],
  VIDEO: ['VIDEO', 'AUDIO_ENGINEER', 'OTHER'],
  SILENCE: ['MUSIC_DIRECTOR', 'OTHER'],
  TRANSITION: ['MUSIC_DIRECTOR', 'KEYS', 'PAD', 'CLICK', 'OTHER'],
  BREAK: ['OTHER'],
  CUSTOM: ['MUSIC_DIRECTOR', 'OTHER'],
};

export const ROLE_LABELS: Record<SetlistMusicalRole, string> = {
  MUSIC_DIRECTOR: 'Director musical',
  BAND_LEADER: 'Lider de banda',
  LEAD_VOCAL: 'Voz principal',
  BACKING_VOCAL: 'Coro / voz de apoyo',
  CHOIR: 'Coro',
  ACOUSTIC_GUITAR: 'Guitarra acustica',
  ELECTRIC_GUITAR: 'Guitarra electrica',
  BASS: 'Bajo',
  DRUMS: 'Bateria',
  PERCUSSION: 'Percusion',
  PIANO: 'Piano',
  KEYS: 'Teclado',
  ORGAN: 'Organo',
  SYNTH: 'Sintetizador',
  STRINGS: 'Cuerdas',
  BRASS: 'Metales',
  WOODWIND: 'Vientos madera',
  VIOLIN: 'Violin',
  CELLO: 'Cello',
  TRACKS: 'Pistas',
  CLICK: 'Click',
  PAD: 'Pad',
  AUDIO_ENGINEER: 'Ingeniero de audio',
  MONITOR_ENGINEER: 'Ingeniero de monitores',
  LIGHTING: 'Iluminacion',
  VIDEO: 'Video',
  SPEAKER: 'Orador',
  PRAYER_LEADER: 'Guia de oracion',
  ANNOUNCER: 'Anunciante',
  OTHER: 'Otro',
};

export function getRoleLabel(role: SetlistMusicalRole): string {
  return ROLE_LABELS[role] ?? role;
}

export const PREPARATION_STATUS_LABELS: Record<AssignmentPreparationStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En preparacion',
  READY: 'Listo',
  NEEDS_REVIEW: 'Necesita revision',
  BLOCKED: 'Bloqueado',
  NOT_APPLICABLE: 'No aplica',
};

export const PREPARATION_STATUS_BADGE_CLASS: Record<AssignmentPreparationStatus, string> = {
  PENDING: 'badge-neutral',
  IN_PROGRESS: 'badge-blue',
  READY: 'badge-primary',
  NEEDS_REVIEW: 'badge-warning',
  BLOCKED: 'badge-danger',
  NOT_APPLICABLE: 'badge-neutral',
};

export const ASSIGNMENT_PREPARATION_STATUS_KEYS = Object.keys(PREPARATION_STATUS_LABELS) as AssignmentPreparationStatus[];

export const PARTICIPANT_STATUS_LABELS: Record<SetlistParticipantStatus, string> = {
  INVITED: 'Invitado',
  CONFIRMED: 'Confirmado',
  DECLINED: 'Rechazado',
  TENTATIVE: 'Tentativo',
  NOT_REQUIRED: 'No requerido',
};

export const PARTICIPANT_STATUS_BADGE_CLASS: Record<SetlistParticipantStatus, string> = {
  INVITED: 'badge-neutral',
  CONFIRMED: 'badge-primary',
  DECLINED: 'badge-danger',
  TENTATIVE: 'badge-warning',
  NOT_REQUIRED: 'badge-neutral',
};
