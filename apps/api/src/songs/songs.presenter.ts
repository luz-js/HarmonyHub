import { SongFileCategory, SongTrackType, TrackProvider } from '@prisma/client';

export type TrackResponseShape = {
  id: string;
  songId: string;
  versionId: string | null;
  name: string;
  type: SongTrackType;
  instrument: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSec: number | null;
  originalFileName: string | null;
  url: string | null;
  provider: TrackProvider;
  volumeDefault: number;
  panDefault: number;
  isPrimary: boolean;
  sortOrder: number;
  active: boolean;
  version: { id: string; name: string; key: string; isDefault: boolean } | null;
  uploadedBy: { id: string; name: string; avatarUrl: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
};

type SongFileResponseShape = {
  id: string;
  songId: string;
  versionId: string | null;
  category: SongFileCategory;
  title: string | null;
  description: string | null;
  isPrimary: boolean;
  sortOrder: number;
  active: boolean;
  version?: { id: string; name: string; key: string; isDefault: boolean } | null;
  file: {
    id: string;
    name: string;
    originalName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    createdAt: Date;
    uploadedBy?: { id: string; name: string; avatarUrl: string | null } | null;
  };
  createdAt: Date;
  updatedAt: Date;
};

type SongSummaryShape = {
  versions: Array<{ id: string; name: string; key: string; bpm: number | null; durationSec: number | null }>;
  _count: { versions: number; tracks: number; songFiles: number };
  [key: string]: unknown;
};

type SongLinkResponseShape = {
  id: string;
  songId: string;
  versionId: string | null;
  provider: string;
  title: string | null;
  url: string;
  externalId: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  isPrimary: boolean;
  sortOrder: number;
  active: boolean;
  version?: { id: string; name: string; key: string; isDefault: boolean } | null;
  createdBy?: { id: string; name: string; avatarUrl: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
};

export function buildInternalSongFileUrl(songId: string, songFileId: string) {
  return `/api/songs/${songId}/files/${songFileId}/download`;
}

export function buildInternalTrackUrl(songId: string, trackId: string) {
  return `/api/songs/${songId}/tracks/${trackId}/stream`;
}

export function sanitizeDownloadFileName(value: string) {
  return value.replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-').trim() || 'track';
}

export function normalizeTrackResponse(track: TrackResponseShape) {
  return {
    id: track.id,
    songId: track.songId,
    versionId: track.versionId,
    name: track.name,
    type: track.type,
    instrument: track.instrument,
    mimeType: track.mimeType,
    sizeBytes: track.sizeBytes,
    durationSec: track.durationSec,
    originalFileName: track.originalFileName,
    url: track.url || (track.provider !== 'EXTERNAL_URL' && track.provider !== 'OTHER' ? buildInternalTrackUrl(track.songId, track.id) : ''),
    provider: track.provider,
    volumeDefault: track.volumeDefault,
    panDefault: track.panDefault,
    isPrimary: track.isPrimary,
    sortOrder: track.sortOrder,
    active: track.active,
    version: track.version,
    uploadedBy: track.uploadedBy,
    createdAt: track.createdAt,
    updatedAt: track.updatedAt,
  };
}

export function normalizeSongFileResponse(songFile: SongFileResponseShape) {
  return {
    id: songFile.id,
    songId: songFile.songId,
    versionId: songFile.versionId,
    category: songFile.category,
    title: songFile.title || songFile.file.name,
    description: songFile.description,
    isPrimary: songFile.isPrimary,
    sortOrder: songFile.sortOrder,
    active: songFile.active,
    version: songFile.version ?? null,
    file: {
      id: songFile.file.id,
      name: songFile.file.name,
      originalName: songFile.file.originalName,
      mimeType: songFile.file.mimeType,
      sizeBytes: songFile.file.sizeBytes,
      url: buildInternalSongFileUrl(songFile.songId, songFile.id),
      createdAt: songFile.file.createdAt,
      uploadedBy: songFile.file.uploadedBy ?? null,
    },
    createdAt: songFile.createdAt,
    updatedAt: songFile.updatedAt,
  };
}

export function normalizeSongSummary(song: SongSummaryShape) {
  const { versions, _count, ...rest } = song;
  const defaultVersion = versions[0];
  return {
    ...rest,
    defaultVersion: defaultVersion
      ? { id: defaultVersion.id, name: defaultVersion.name, key: defaultVersion.key, bpm: defaultVersion.bpm, durationSec: defaultVersion.durationSec }
      : null,
    versionsCount: _count.versions,
    tracksCount: _count.tracks,
    filesCount: _count.songFiles,
  };
}

export function normalizeLinkResponse(link: SongLinkResponseShape) {
  return {
    id: link.id,
    songId: link.songId,
    versionId: link.versionId,
    provider: link.provider,
    title: link.title,
    url: link.url,
    externalId: link.externalId,
    embedUrl: link.embedUrl,
    thumbnailUrl: link.thumbnailUrl,
    isPrimary: link.isPrimary,
    sortOrder: link.sortOrder,
    active: link.active,
    version: link.version ?? null,
    createdBy: link.createdBy ?? null,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}
