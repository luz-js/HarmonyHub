/**
 * Listas de valores que la API y la web comparten. Son copias de los enums de Prisma (la web no puede importar
 * Prisma): una prueba de la API (contracts-enums.test.ts) falla si alguna deja de coincidir con el schema.
 */

export const MEMBERSHIP_ROLES = ['OWNER', 'ADMIN', 'LEADER', 'MUSICIAN', 'GUEST'] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const SETLIST_MUSICAL_ROLES = [
  'MUSIC_DIRECTOR', 'BAND_LEADER', 'LEAD_VOCAL', 'BACKING_VOCAL', 'CHOIR',
  'ACOUSTIC_GUITAR', 'ELECTRIC_GUITAR', 'BASS', 'DRUMS', 'PERCUSSION', 'PIANO', 'KEYS', 'ORGAN', 'SYNTH', 'STRINGS', 'BRASS', 'WOODWIND', 'VIOLIN', 'CELLO',
  'TRACKS', 'CLICK', 'PAD',
  'AUDIO_ENGINEER', 'MONITOR_ENGINEER', 'LIGHTING', 'VIDEO',
  'SPEAKER', 'PRAYER_LEADER', 'ANNOUNCER',
  'OTHER',
] as const;
export type SetlistMusicalRole = (typeof SETLIST_MUSICAL_ROLES)[number];

export const MEMBERSHIP_STATUSES = ['ACTIVE', 'INACTIVE', 'INVITED'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const ORGANIZATION_TYPES = ['BAND', 'MINISTRY', 'ACOUSTIC_GROUP', 'ORCHESTRA', 'OTHER'] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const INVITATION_STATUSES = ['PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED', 'DECLINED'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const EVENT_STATUSES = ['DRAFT', 'PENDING', 'CONFIRMED', 'CANCELLED', 'FINISHED'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const ATTENDANCE_STATUSES = ['PENDING', 'CONFIRMED', 'DECLINED'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const SETLIST_STATUSES = ['DRAFT', 'READY', 'PUBLISHED', 'ARCHIVED'] as const;
export type SetlistStatus = (typeof SETLIST_STATUSES)[number];
