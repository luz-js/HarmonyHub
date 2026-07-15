import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { streamSongTrack } from '../api/songs.client';
import type { SongTrack } from '../../../shared/types';

const VOLUME_STORAGE_KEY = 'harmonyhub.audio.volume';

export interface AudioPlayerTrackMeta {
  songTitle: string;
}

export interface AudioPlayerContextValue {
  currentTrack: SongTrack | null;
  currentTrackMeta: AudioPlayerTrackMeta | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  error: string | null;
  hasNext: boolean;
  hasPrevious: boolean;
  playTrack: (track: SongTrack, meta?: AudioPlayerTrackMeta) => Promise<void>;
  togglePlay: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  stop: () => void;
  /** Define el contexto de reproduccion visible (filtro + agrupacion) para anterior/siguiente. */
  setPlaybackQueue: (tracks: SongTrack[]) => void;
  playNext: () => void;
  playPrevious: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

function isExternalTrack(track: SongTrack) {
  return track.provider === 'EXTERNAL_URL' || track.provider === 'OTHER';
}

function canUseHotkeys(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return true;
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return false;
  return true;
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const currentTrackRef = useRef<SongTrack | null>(null);
  const lastVolumeRef = useRef(1);
  const [currentTrack, setCurrentTrack] = useState<SongTrack | null>(null);
  const [currentTrackMeta, setCurrentTrackMeta] = useState<AudioPlayerTrackMeta | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    const stored = Number(localStorage.getItem(VOLUME_STORAGE_KEY) || '1');
    return Number.isFinite(stored) ? Math.min(1, Math.max(0, stored)) : 1;
  });
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<SongTrack[]>([]);
  const queueRef = useRef<SongTrack[]>([]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volume;
    audio.playbackRate = playbackRate;
    audioRef.current = audio;

    function syncTime() {
      setCurrentTime(audio.currentTime || 0);
    }

    function syncDuration() {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    }

    function handlePlay() {
      setIsPlaying(true);
      setIsLoading(false);
    }

    function handlePause() {
      setIsPlaying(false);
    }

    function handleEnded() {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    }

    function handleError() {
      setIsLoading(false);
      setIsPlaying(false);
      setError('No se pudo reproducir esta pista.');
    }

    function handleVolumeChange() {
      setVolumeState(audio.volume);
      setMuted(audio.muted);
    }

    audio.addEventListener('timeupdate', syncTime);
    audio.addEventListener('loadedmetadata', syncDuration);
    audio.addEventListener('durationchange', syncDuration);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('volumechange', handleVolumeChange);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', syncTime);
      audio.removeEventListener('loadedmetadata', syncDuration);
      audio.removeEventListener('durationchange', syncDuration);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('volumechange', handleVolumeChange);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!canUseHotkeys(event.target)) return;
      if (!audioRef.current || !currentTrackRef.current) return;

      if (event.code === 'Space') {
        event.preventDefault();
        if (audioRef.current.paused) {
          void audioRef.current.play().catch(() => setError('No se pudo reproducir esta pista.'));
        } else {
          audioRef.current.pause();
        }
      }

      if (event.code === 'ArrowRight') {
        event.preventDefault();
        audioRef.current.currentTime = Math.min((audioRef.current.duration || 0), audioRef.current.currentTime + 5);
      }

      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function loadTrackSource(track: SongTrack) {
    const audio = audioRef.current;
    if (!audio) return;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (isExternalTrack(track)) {
      audio.src = track.url;
      audio.load();
      return;
    }

    const blob = await streamSongTrack(track.songId, track.id);
    const objectUrl = URL.createObjectURL(blob);
    objectUrlRef.current = objectUrl;
    audio.src = objectUrl;
    audio.load();
  }

  async function playTrack(track: SongTrack, meta?: AudioPlayerTrackMeta) {
    const audio = audioRef.current;
    if (!audio) return;

    setError(null);
    setIsLoading(true);

    const trackChanged = currentTrackRef.current?.id !== track.id;
    currentTrackRef.current = track;
    setCurrentTrack(track);
    if (meta) setCurrentTrackMeta(meta);

    if (trackChanged) {
      audio.pause();
      setCurrentTime(0);
      setDuration(track.durationSec || 0);
      await loadTrackSource(track);
    }

    audio.volume = volume;
    audio.muted = muted;
    audio.playbackRate = playbackRate;

    try {
      await audio.play();
    } catch {
      setIsLoading(false);
      setIsPlaying(false);
      setError('No se pudo reproducir esta pista.');
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !currentTrackRef.current) return;
    if (audio.paused) {
      void audio.play().catch(() => setError('No se pudo reproducir esta pista.'));
      return;
    }
    audio.pause();
  }

  function pause() {
    audioRef.current?.pause();
  }

  function seek(time: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(Number.isFinite(audio.duration) ? audio.duration : time, time));
    setCurrentTime(audio.currentTime);
  }

  function setVolume(volumeValue: number) {
    const audio = audioRef.current;
    const nextVolume = Math.max(0, Math.min(1, volumeValue));
    setVolumeState(nextVolume);
    localStorage.setItem(VOLUME_STORAGE_KEY, String(nextVolume));
    if (nextVolume > 0) lastVolumeRef.current = nextVolume;
    if (audio) {
      audio.volume = nextVolume;
      if (nextVolume > 0 && audio.muted) audio.muted = false;
    }
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.muted || audio.volume === 0) {
      const restored = lastVolumeRef.current || 1;
      audio.muted = false;
      audio.volume = restored;
      setVolumeState(restored);
      localStorage.setItem(VOLUME_STORAGE_KEY, String(restored));
      return;
    }
    lastVolumeRef.current = audio.volume || lastVolumeRef.current;
    audio.muted = true;
  }

  function setPlaybackRate(rate: number) {
    const audio = audioRef.current;
    const nextRate = Math.max(0.5, Math.min(2, rate));
    setPlaybackRateState(nextRate);
    if (audio) audio.playbackRate = nextRate;
  }

  function setPlaybackQueue(tracks: SongTrack[]) {
    queueRef.current = tracks;
    setQueue(tracks);
  }

  function playAtOffset(offset: -1 | 1) {
    const items = queueRef.current;
    const current = currentTrackRef.current;
    if (!current || items.length === 0) return;
    const index = items.findIndex((item) => item.id === current.id);
    if (index < 0) return;
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    void playTrack(items[nextIndex]);
  }

  function playNext() {
    playAtOffset(1);
  }

  function playPrevious() {
    playAtOffset(-1);
  }

  const currentQueueIndex = currentTrack ? queue.findIndex((item) => item.id === currentTrack.id) : -1;
  const hasPrevious = currentQueueIndex > 0;
  const hasNext = currentQueueIndex >= 0 && currentQueueIndex < queue.length - 1;

  function stop() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.src = '';
    setCurrentTrack(null);
    setCurrentTrackMeta(null);
    currentTrackRef.current = null;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsLoading(false);
    setError(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        currentTrackMeta,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        volume,
        muted,
        playbackRate,
        error,
        hasNext,
        hasPrevious,
        playTrack,
        togglePlay,
        pause,
        seek,
        setVolume,
        toggleMute,
        setPlaybackRate,
        stop,
        setPlaybackQueue,
        playNext,
        playPrevious,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return context;
}
