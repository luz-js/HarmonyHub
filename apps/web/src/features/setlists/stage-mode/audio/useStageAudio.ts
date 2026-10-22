import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SetlistCue, SetlistItem, SongTrack } from '../../../../shared/types';
import { streamSongTrack } from '../../../songs/api/songs.client';
import { useSongTracks } from '../../../songs/hooks/useSongTracks';
import type { AudioBufferLike, AudioContextLike } from './audioTypes';
import { shouldTriggerCue, splitTracks, startsMuted, type CueAudioAction } from './cueAudio';
import { Metronome } from './metronome';
import { FADE_SEC, MultitrackPlayer } from './multitrack';
import { PadPlayer } from './padPlayer';

export type StageTrackState = {
  track: SongTrack;
  status: 'loading' | 'ready' | 'error';
  error?: string;
  volume: number;
  muted: boolean;
  solo: boolean;
};

type Engines = { context: AudioContextLike; tracks: MultitrackPlayer; metronome: Metronome; pad: PadPlayer };

export type StageAudioDeps = {
  createContext?: () => AudioContextLike;
  loadTrack?: (track: SongTrack) => Promise<Blob>;
};

const defaultCreateContext = () => new AudioContext() as unknown as AudioContextLike;
const defaultLoadTrack = (track: SongTrack) => streamSongTrack(track.songId, track.id);

export const DECODE_ERROR = 'No se pudo decodificar: formato de audio no compatible con este navegador.';

/**
 * Audio de Stage Mode para quien opera: stems sincronizados, pad en loop y metronomo, disparados por los cues
 * de audio del item actual. Nada suena hasta "Activar audio" (los navegadores exigen un toque antes de sonar) y
 * el audio sale solo en este dispositivo. Las pistas se piden con la sesion normal, asi que las ya descargadas
 * salen de la cache sin conexion.
 */
export function useStageAudio({
  organizationId,
  enabled,
  item,
  currentCue,
  deps = {},
}: {
  organizationId: string;
  enabled: boolean;
  item: SetlistItem | null;
  currentCue: SetlistCue | null;
  deps?: StageAudioDeps;
}) {
  const createContext = deps.createContext ?? defaultCreateContext;
  const loadTrack = deps.loadTrack ?? defaultLoadTrack;
  const engines = useRef<Engines | null>(null);
  const [armed, setArmed] = useState(false);
  const [tracks, setTracks] = useState<StageTrackState[]>([]);
  const [padState, setPadState] = useState<{ track: SongTrack | null; status: 'none' | 'loading' | 'ready' | 'error' }>({ track: null, status: 'none' });
  const padBuffer = useRef<AudioBufferLike | null>(null);
  const [masterVolume, setMasterVolumeState] = useState(0.9);
  const [isPlaying, setIsPlaying] = useState(false);
  const [padPlaying, setPadPlaying] = useState(false);
  const [clickRunning, setClickRunning] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [message, setMessage] = useState('');
  const pendingStart = useRef(false);

  const songId = item?.type === 'SONG' ? (item.songId ?? '') : '';
  const tracksQuery = useSongTracks(organizationId, enabled && armed ? songId : '', { versionId: item?.songVersionId });
  const songTracks = useMemo(() => (songId ? (tracksQuery.data ?? []) : []), [songId, tracksQuery.data]);

  const arm = useCallback(async () => {
    if (!engines.current) {
      const context = createContext();
      engines.current = { context, tracks: new MultitrackPlayer(context), metronome: new Metronome(context), pad: new PadPlayer(context) };
      engines.current.tracks.setMasterVolume(masterVolume);
      engines.current.tracks.setOnEnded(() => setIsPlaying(false));
    }
    await engines.current.context.resume();
    setArmed(true);
  }, [createContext, masterVolume]);

  // Al cambiar de cancion: fundido corto de lo que sonaba y se cargan las pistas nuevas.
  useEffect(() => {
    const current = engines.current;
    if (!current || !armed) return;
    current.tracks.fadeOutAndStop(FADE_SEC, masterVolume);
    current.pad.stop(FADE_SEC);
    current.metronome.stop();
    setIsPlaying(false);
    setPadPlaying(false);
    setClickRunning(false);
    setPosition(0);
    pendingStart.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar de item; el volumen maestro vigente se lee del ref del reproductor
  }, [item?.id, armed]);

  useEffect(() => {
    const current = engines.current;
    if (!current || !armed) return;
    let cancelled = false;
    const { pad, stems } = splitTracks(songTracks);
    setTracks(stems.map((track) => ({ track, status: 'loading', volume: track.volumeDefault ?? 1, muted: startsMuted(track, stems.length), solo: false })));
    setPadState({ track: pad, status: pad ? 'loading' : 'none' });
    padBuffer.current = null;
    setDuration(0);

    async function decode(track: SongTrack) {
      const blob = await loadTrack(track);
      return current!.context.decodeAudioData(await blob.arrayBuffer());
    }

    void Promise.all(
      stems.map(async (track) => {
        try {
          const buffer = await decode(track);
          if (!cancelled) setTracks((rows) => rows.map((row) => (row.track.id === track.id ? { ...row, status: 'ready' } : row)));
          return { id: track.id, buffer };
        } catch (error) {
          const text = error instanceof Error && /decod|encoding/i.test(`${error.name} ${error.message}`) ? DECODE_ERROR : error instanceof Error ? error.message : DECODE_ERROR;
          if (!cancelled) setTracks((rows) => rows.map((row) => (row.track.id === track.id ? { ...row, status: 'error', error: text } : row)));
          return null;
        }
      }),
    ).then((loaded) => {
      if (cancelled) return;
      current.tracks.load(loaded.filter((row): row is { id: string; buffer: AudioBufferLike } => row !== null));
      setDuration(current.tracks.duration);
      if (pendingStart.current) {
        pendingStart.current = false;
        current.tracks.play();
        setIsPlaying(current.tracks.isPlaying);
      }
    });

    if (pad) {
      decode(pad).then(
        (buffer) => {
          if (cancelled) return;
          padBuffer.current = buffer;
          setPadState({ track: pad, status: 'ready' });
        },
        () => !cancelled && setPadState({ track: pad, status: 'error' }),
      );
    }
    return () => {
      cancelled = true;
    };
  }, [armed, songTracks, loadTrack]);

  // La mezcla se aplica cada vez que cambia (y cuando terminan de cargar).
  useEffect(() => {
    engines.current?.tracks.applyMix(tracks.map((row) => ({ id: row.track.id, volume: row.volume, muted: row.muted, solo: row.solo })));
  }, [tracks]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => setPosition(engines.current?.tracks.position ?? 0), 250);
    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(
    () => () => {
      const current = engines.current;
      engines.current = null;
      if (!current) return;
      current.tracks.dispose();
      current.metronome.dispose();
      current.pad.dispose();
      void current.context.close();
    },
    [],
  );

  const play = useCallback(() => {
    const current = engines.current;
    if (!current) return;
    if (tracks.some((row) => row.status === 'loading')) {
      pendingStart.current = true;
      setMessage('Las pistas arrancan en cuanto terminen de cargar.');
      return;
    }
    setMessage('');
    current.tracks.play();
    setIsPlaying(current.tracks.isPlaying);
  }, [tracks]);

  const pause = useCallback(() => {
    engines.current?.tracks.pause();
    pendingStart.current = false;
    setIsPlaying(false);
    setPosition(engines.current?.tracks.position ?? 0);
  }, []);

  const stop = useCallback(() => {
    engines.current?.tracks.stop();
    pendingStart.current = false;
    setIsPlaying(false);
    setPosition(0);
  }, []);

  const seek = useCallback((seconds: number) => {
    engines.current?.tracks.seek(seconds);
    setPosition(engines.current?.tracks.position ?? 0);
  }, []);

  const startClick = useCallback(() => {
    if (!engines.current) return;
    engines.current.metronome.start({ bpm: item?.effective.bpm, timeSignature: item?.song?.timeSignature });
    setClickRunning(true);
  }, [item]);

  const stopClick = useCallback(() => {
    engines.current?.metronome.stop();
    setClickRunning(false);
  }, []);

  const startPad = useCallback(() => {
    if (!engines.current) return;
    if (!padBuffer.current) {
      setMessage(padState.status === 'loading' ? 'El pad todavía está cargando.' : 'Esta canción no tiene una pista de pad (tipo PAD).');
      return;
    }
    setMessage('');
    engines.current.pad.start(padBuffer.current);
    setPadPlaying(true);
  }, [padState.status]);

  const stopPad = useCallback(() => {
    engines.current?.pad.stop();
    setPadPlaying(false);
  }, []);

  /** Detiene todo (click, pad con fundido y pistas). */
  const stopAll = useCallback(() => {
    stop();
    stopClick();
    stopPad();
  }, [stop, stopClick, stopPad]);

  const runAction = useCallback(
    (action: CueAudioAction) => {
      const actions: Record<CueAudioAction, () => void> = {
        'click-start': startClick,
        'click-stop': stopClick,
        'pad-start': startPad,
        'pad-stop': stopPad,
        'tracks-start': play,
        'tracks-stop': () => {
          engines.current?.tracks.fadeOutAndStop(FADE_SEC, masterVolume);
          setIsPlaying(false);
          setPosition(0);
        },
      };
      actions[action]();
    },
    [masterVolume, play, startClick, startPad, stopClick, stopPad],
  );

  // Cues: cuando quien opera llega a un cue de audio del item actual, se hace lo que dice. Al activar el audio no
  // se dispara el cue en el que ya estaba (solo los siguientes).
  const lastCueId = useRef<string | null>(null);
  const cueId = currentCue?.id ?? null;
  useEffect(() => {
    if (!armed) {
      lastCueId.current = cueId;
      return;
    }
    if (cueId === lastCueId.current) return;
    lastCueId.current = cueId;
    const action = shouldTriggerCue(currentCue, item?.id ?? null, armed);
    if (action) runAction(action);
  }, [armed, cueId, currentCue, item?.id, runAction]);

  const updateTrack = useCallback((trackId: string, patch: Partial<Pick<StageTrackState, 'volume' | 'muted' | 'solo'>>) => {
    setTracks((rows) => rows.map((row) => (row.track.id === trackId ? { ...row, ...patch } : row)));
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    setMasterVolumeState(volume);
    engines.current?.tracks.setMasterVolume(volume);
  }, []);

  return {
    armed,
    arm,
    tracks,
    pad: { ...padState, playing: padPlaying, start: startPad, stop: stopPad },
    click: { running: clickRunning, start: startClick, stop: stopClick, bpm: item?.effective.bpm ?? null, timeSignature: item?.song?.timeSignature ?? null },
    masterVolume,
    setMasterVolume,
    updateTrack,
    isPlaying,
    position,
    duration,
    play,
    pause,
    stop,
    seek,
    stopAll,
    runAction,
    message,
    loadingTracks: tracksQuery.isLoading,
  };
}

export type StageAudio = ReturnType<typeof useStageAudio>;
