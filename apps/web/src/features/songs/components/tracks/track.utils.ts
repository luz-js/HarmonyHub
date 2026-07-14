import type { SongTrack, SongTrackType } from '../../../../shared/types';

export const trackTypeLabels: Record<SongTrackType, string> = {
  FULL_TRACK: 'Full Track',
  BACKING_TRACK: 'Backing',
  CLICK: 'Click',
  PAD: 'Pad',
  DRUMS: 'Drums',
  BASS: 'Bass',
  GUITAR: 'Guitar',
  KEYS: 'Keys',
  VOCALS: 'Voz',
  CHOIR: 'Coros',
  GUIDE: 'Guia',
  REFERENCE: 'Referencia',
  OTHER: 'Otro',
};

export function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
  const safe = Math.floor(seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function formatTrackDuration(seconds?: number | null) {
  if (!seconds && seconds !== 0) return '-';
  return formatAudioTime(seconds);
}

export function formatBytes(bytes?: number | null) {
  if (!bytes && bytes !== 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function normalizeTrackOrder(tracks: SongTrack[]) {
  return tracks
    .slice()
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    })
    .map((track, index) => ({ ...track, sortOrder: index }));
}

export function groupTracksByVersion(tracks: SongTrack[], activeVersionId?: string | null) {
  return {
    versionTracks: normalizeTrackOrder(tracks.filter((track) => track.versionId === activeVersionId)),
    generalTracks: normalizeTrackOrder(tracks.filter((track) => track.versionId === null)),
    otherVersionTracks: normalizeTrackOrder(tracks.filter((track) => track.versionId !== null && track.versionId !== activeVersionId)),
  };
}
