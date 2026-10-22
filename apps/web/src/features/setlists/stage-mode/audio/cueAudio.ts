import type { SetlistCueType, SongTrack } from '../../../../shared/types';

export type CueAudioAction = 'click-start' | 'click-stop' | 'pad-start' | 'pad-stop' | 'tracks-start' | 'tracks-stop';

const CUE_ACTIONS: Partial<Record<SetlistCueType, CueAudioAction>> = {
  CLICK_START: 'click-start',
  CLICK_STOP: 'click-stop',
  PAD_START: 'pad-start',
  PAD_STOP: 'pad-stop',
  TRACK_START: 'tracks-start',
  TRACK_STOP: 'tracks-stop',
};

/** Que hace el audio con un cue (null: el cue no es de audio). */
export function cueAudioAction(type: SetlistCueType): CueAudioAction | null {
  return CUE_ACTIONS[type] ?? null;
}

/**
 * Un cue dispara audio solo si es del item que esta en pantalla (o general del setlist, sin item) y si el audio
 * ya esta activado por quien opera.
 */
export function shouldTriggerCue(cue: { type: SetlistCueType; setlistItemId: string | null } | null, currentItemId: string | null, armed: boolean) {
  if (!cue || !armed) return null;
  if (cue.setlistItemId && cue.setlistItemId !== currentItemId) return null;
  return cueAudioAction(cue.type);
}

/** Pistas que se pueden reproducir: guardadas en HarmonyHub y activas (las de enlaces externos no se pueden decodificar). */
export function playableTracks(tracks: SongTrack[]) {
  return tracks.filter((track) => track.active && track.provider !== 'EXTERNAL_URL' && track.provider !== 'OTHER').sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

/** El pad es la primera pista de tipo PAD; los stems son el resto (el pad va aparte, en loop). */
export function splitTracks(tracks: SongTrack[]) {
  const playable = playableTracks(tracks);
  const pad = playable.find((track) => track.type === 'PAD') ?? null;
  return { pad, stems: playable.filter((track) => track !== pad) };
}

/** La mezcla completa y la de referencia duplican a los stems: arrancan silenciadas (se pueden activar). */
export function startsMuted(track: Pick<SongTrack, 'type'>, stemCount: number) {
  return stemCount > 1 && (track.type === 'FULL_TRACK' || track.type === 'REFERENCE');
}
