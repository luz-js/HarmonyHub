import type { CueCategory, SetlistCueType, SetlistMusicalRole } from '../../../../shared/types';

/** Duplicado deliberado de `CATEGORY_BY_TYPE` en `apps/api/src/setlists/cues/setlist-cue.utils.ts`. */
const CATEGORY_BY_TYPE: Record<SetlistCueType, CueCategory> = {
  COUNT_IN: 'MUSICAL',
  MUSIC_ENTRY: 'MUSICAL',
  MUSIC_STOP: 'MUSICAL',
  DYNAMICS_UP: 'MUSICAL',
  DYNAMICS_DOWN: 'MUSICAL',
  REPEAT_SECTION: 'MUSICAL',
  SKIP_SECTION: 'MUSICAL',
  MODULATION: 'MUSICAL',
  TEMPO_CHANGE: 'MUSICAL',
  FREE_TIME: 'MUSICAL',
  HOLD: 'MUSICAL',
  ENDING: 'MUSICAL',

  CLICK_START: 'TRACKS',
  CLICK_STOP: 'TRACKS',
  PAD_START: 'TRACKS',
  PAD_STOP: 'TRACKS',
  TRACK_START: 'TRACKS',
  TRACK_STOP: 'TRACKS',

  SPEAKING: 'SPEAKING',
  PRAYER: 'SPEAKING',
  ANNOUNCEMENT: 'SPEAKING',
  SILENCE: 'SPEAKING',

  VIDEO_START: 'VIDEO',
  VIDEO_STOP: 'VIDEO',
  SLIDE_CHANGE: 'VIDEO',
  LYRICS_ON: 'VIDEO',
  LYRICS_OFF: 'VIDEO',

  LIGHTS_SCENE: 'LIGHTING',
  LIGHTS_BLACKOUT: 'LIGHTING',
  LIGHTS_FADE: 'LIGHTING',

  AUDIO_MUTE: 'AUDIO',
  AUDIO_UNMUTE: 'AUDIO',
  AUDIO_LEVEL: 'AUDIO',
  MONITOR_CHANGE: 'AUDIO',

  INSTRUMENT_CHANGE: 'INSTRUMENT',
  CAPO_CHANGE: 'INSTRUMENT',
  PATCH_CHANGE: 'INSTRUMENT',
  TUNING_CHANGE: 'INSTRUMENT',

  ENTER_STAGE: 'LOGISTICS',
  EXIT_STAGE: 'LOGISTICS',
  POSITION_CHANGE: 'LOGISTICS',
  TIMER: 'LOGISTICS',
  MARKER: 'LOGISTICS',

  CUSTOM: 'CUSTOM',
};

export function getCueCategory(type: SetlistCueType): CueCategory {
  return CATEGORY_BY_TYPE[type];
}

export const CUE_CATEGORIES: CueCategory[] = ['MUSICAL', 'TRACKS', 'SPEAKING', 'VIDEO', 'LIGHTING', 'AUDIO', 'INSTRUMENT', 'LOGISTICS', 'CUSTOM'];

export const CUE_CATEGORY_LABELS: Record<CueCategory, string> = {
  MUSICAL: 'Música',
  TRACKS: 'Pistas',
  SPEAKING: 'Habla',
  VIDEO: 'Video',
  LIGHTING: 'Luces',
  AUDIO: 'Audio',
  INSTRUMENT: 'Instrumento',
  LOGISTICS: 'Logística',
  CUSTOM: 'Personalizado',
};

/**
 * Roles sugeridos por tipo de cue — solo para ordenar el picker de responsable, nunca para
 * restringir: el usuario puede elegir cualquier participante autorizado.
 */
const SUGGESTED_ROLES_BY_TYPE: Partial<Record<SetlistCueType, SetlistMusicalRole[]>> = {
  COUNT_IN: ['MUSIC_DIRECTOR', 'BAND_LEADER'],
  CLICK_START: ['CLICK', 'TRACKS'],
  CLICK_STOP: ['CLICK', 'TRACKS'],
  PAD_START: ['PAD', 'KEYS', 'TRACKS'],
  PAD_STOP: ['PAD', 'KEYS', 'TRACKS'],
  TRACK_START: ['TRACKS'],
  TRACK_STOP: ['TRACKS'],
  VIDEO_START: ['VIDEO'],
  VIDEO_STOP: ['VIDEO'],
  SLIDE_CHANGE: ['VIDEO'],
  LIGHTS_SCENE: ['LIGHTING'],
  LIGHTS_BLACKOUT: ['LIGHTING'],
  LIGHTS_FADE: ['LIGHTING'],
  AUDIO_MUTE: ['AUDIO_ENGINEER', 'MONITOR_ENGINEER'],
  AUDIO_UNMUTE: ['AUDIO_ENGINEER', 'MONITOR_ENGINEER'],
  AUDIO_LEVEL: ['AUDIO_ENGINEER', 'MONITOR_ENGINEER'],
  MONITOR_CHANGE: ['AUDIO_ENGINEER', 'MONITOR_ENGINEER'],
  SPEAKING: ['SPEAKER'],
  PRAYER: ['PRAYER_LEADER'],
  ANNOUNCEMENT: ['ANNOUNCER'],
};

export function getSuggestedRolesForCueType(type: SetlistCueType): SetlistMusicalRole[] {
  return SUGGESTED_ROLES_BY_TYPE[type] ?? [];
}
