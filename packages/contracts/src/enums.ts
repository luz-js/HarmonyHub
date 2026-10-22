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

export const SETLIST_ITEM_TYPES = ['SONG', 'SPEAKING', 'PRAYER', 'VIDEO', 'ANNOUNCEMENT', 'SILENCE', 'TRANSITION', 'BREAK', 'CUSTOM'] as const;
export type SetlistItemType = (typeof SETLIST_ITEM_TYPES)[number];

export const SETLIST_PARTICIPANT_STATUSES = ['INVITED', 'CONFIRMED', 'DECLINED', 'TENTATIVE', 'NOT_REQUIRED'] as const;
export type SetlistParticipantStatus = (typeof SETLIST_PARTICIPANT_STATUSES)[number];

export const ASSIGNMENT_PREPARATION_STATUSES = ['PENDING', 'IN_PROGRESS', 'READY', 'NEEDS_REVIEW', 'BLOCKED', 'NOT_APPLICABLE'] as const;
export type AssignmentPreparationStatus = (typeof ASSIGNMENT_PREPARATION_STATUSES)[number];

export const SETLIST_CUE_TYPES = [
  'COUNT_IN', 'CLICK_START', 'CLICK_STOP', 'PAD_START', 'PAD_STOP', 'TRACK_START', 'TRACK_STOP',
  'MUSIC_ENTRY', 'MUSIC_STOP', 'DYNAMICS_UP', 'DYNAMICS_DOWN', 'REPEAT_SECTION', 'SKIP_SECTION', 'MODULATION', 'TEMPO_CHANGE', 'FREE_TIME', 'HOLD', 'ENDING',
  'SPEAKING', 'PRAYER', 'ANNOUNCEMENT', 'SILENCE',
  'VIDEO_START', 'VIDEO_STOP', 'SLIDE_CHANGE', 'LYRICS_ON', 'LYRICS_OFF',
  'LIGHTS_SCENE', 'LIGHTS_BLACKOUT', 'LIGHTS_FADE',
  'AUDIO_MUTE', 'AUDIO_UNMUTE', 'AUDIO_LEVEL', 'MONITOR_CHANGE',
  'INSTRUMENT_CHANGE', 'CAPO_CHANGE', 'PATCH_CHANGE', 'TUNING_CHANGE',
  'ENTER_STAGE', 'EXIT_STAGE', 'POSITION_CHANGE',
  'TIMER', 'MARKER', 'CUSTOM',
] as const;
export type SetlistCueType = (typeof SETLIST_CUE_TYPES)[number];

export const SETLIST_CUE_PHASES = ['BEFORE', 'DURING', 'AFTER', 'GLOBAL'] as const;
export type SetlistCuePhase = (typeof SETLIST_CUE_PHASES)[number];

export const SETLIST_CUE_STATUSES = ['PENDING', 'READY', 'NEEDS_REVIEW', 'BLOCKED', 'COMPLETED', 'SKIPPED'] as const;
export type SetlistCueStatus = (typeof SETLIST_CUE_STATUSES)[number];

export const SETLIST_CUE_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] as const;
export type SetlistCuePriority = (typeof SETLIST_CUE_PRIORITIES)[number];

// Estas dos no son enums de Prisma: son opciones de la API (copiar asignaciones, agrupar cues).
export const COPY_ASSIGNMENTS_MODES = ['ALL', 'MUSICIANS_ONLY', 'VOCALS_ONLY', 'TECH_ONLY'] as const;
export type CopyAssignmentsMode = (typeof COPY_ASSIGNMENTS_MODES)[number];

export const CUE_CATEGORIES = ['MUSICAL', 'AUDIO', 'TRACKS', 'VIDEO', 'LIGHTING', 'SPEAKING', 'LOGISTICS', 'INSTRUMENT', 'CUSTOM'] as const;
export type CueCategory = (typeof CUE_CATEGORIES)[number];
