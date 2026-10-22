import { extname } from 'node:path';
import { BadRequestException } from '@nestjs/common';

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
  'audio/flac',
  'audio/webm',
]);

const ALLOWED_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm']);

// Los esquemas de validacion de canciones viven en @harmonyhub/contracts (songs.ts).

export function parseTags(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

export function buildContentJson(lyrics?: string | null, chords?: string | null) {
  return {
    version: 1,
    sections: [
      {
        id: 'section-main-1',
        type: 'VERSE',
        name: 'Verso 1',
        order: 0,
        lines: [{ id: 'line-main-1', order: 0, chords: chords || '', lyrics: lyrics || '' }],
      },
    ],
  };
}

export function normalizeOptionalId(value?: string | null) {
  return value ? value.trim() : null;
}

export function maxTrackUploadBytes() {
  const mb = Number(process.env.MAX_TRACK_UPLOAD_MB || 100);
  return Math.max(1, Number.isFinite(mb) ? mb : 100) * 1024 * 1024;
}

export function validateAudioUploadFile(file: { mimetype?: string; size?: number; originalname?: string }) {
  const mimeType = (file.mimetype || '').toLowerCase();
  const extension = extname(file.originalname || '').toLowerCase();

  if (!ALLOWED_AUDIO_MIME_TYPES.has(mimeType)) {
    throw new BadRequestException('Tipo de audio no soportado');
  }

  if (!ALLOWED_AUDIO_EXTENSIONS.has(extension)) {
    throw new BadRequestException('Extension de audio no soportada');
  }

  if ((file.size || 0) > maxTrackUploadBytes()) {
    throw new BadRequestException(`La pista supera el limite de ${Math.round(maxTrackUploadBytes() / 1024 / 1024)} MB`);
  }
}

export function buildTrackStorageSegments(organizationId: string, songId: string, trackId: string, versionId?: string | null) {
  if (versionId) {
    return ['organizations', organizationId, 'songs', songId, 'versions', versionId, 'tracks', trackId];
  }

  return ['organizations', organizationId, 'songs', songId, 'tracks', trackId];
}

export function buildSongFileStorageSegments(organizationId: string, songId: string, fileId: string, versionId?: string | null) {
  if (versionId) {
    return ['organizations', organizationId, 'songs', songId, 'versions', versionId, 'files', fileId];
  }

  return ['organizations', organizationId, 'songs', songId, 'files', fileId];
}
