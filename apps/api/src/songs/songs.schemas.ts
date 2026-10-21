import { extname } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { SongTrackType, TrackProvider } from '@prisma/client';
import { z } from 'zod';

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

const sectionLineSchema = z.object({
  id: z.string().min(1),
  order: z.coerce.number().int().nonnegative(),
  chords: z.string().optional().default(''),
  lyrics: z.string().optional().default(''),
});

export const contentSchema = z.object({
  version: z.literal(1).default(1),
  sections: z.array(z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    name: z.string().min(1),
    order: z.coerce.number().int().nonnegative(),
    chords: z.array(z.string()).optional(),
    lyrics: z.string().optional(),
    lines: z.array(sectionLineSchema).default([]),
    notes: z.string().optional(),
    collapsed: z.boolean().optional(),
  })).default([]),
});

const keySchema = z.string().regex(/^[A-G](#|b)?(m| minor| major| menor| mayor)?$/i, 'Tonalidad invalida');

export const songSchema = z.object({
  title: z.string().min(1, 'Titulo requerido'),
  artist: z.string().min(1, 'Artista requerido'),
  album: z.string().optional().nullable(),
  year: z.coerce.number().int().positive().optional().nullable(),
  genre: z.string().optional().nullable(),
  originalKey: keySchema.default('C'),
  currentKey: keySchema.default('C'),
  bpm: z.coerce.number().int().positive().max(320).optional().nullable(),
  durationSec: z.coerce.number().int().positive().optional().nullable(),
  timeSignature: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  isFavorite: z.boolean().default(false),
  coverUrl: z.string().optional().nullable(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('ACTIVE'),
  lyrics: z.string().optional().nullable(),
  chords: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  youtubeUrl: z.string().optional().nullable(),
});

export const updateSongSchema = songSchema.partial();

export const versionSchema = z.object({
  name: z.string().min(1).default('Original'),
  key: keySchema.default('C'),
  bpm: z.coerce.number().int().positive().max(320).optional().nullable(),
  durationSec: z.coerce.number().int().positive().optional().nullable(),
  lyrics: z.string().optional().nullable(),
  chords: z.string().optional().nullable(),
  contentJson: contentSchema.optional(),
  structureJson: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
});

export const createLinkSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(1, 'Titulo requerido').max(160, 'Titulo demasiado largo'),
  url: z.string().trim().min(1, 'URL requerida'),
  isPrimary: z.boolean().default(false),
});

export const updateLinkSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(1, 'Titulo requerido').max(160, 'Titulo demasiado largo').optional(),
  url: z.string().trim().min(1, 'URL requerida').optional(),
  isPrimary: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

export const reorderLinksSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  items: z.array(z.object({
    id: z.string().min(1),
    sortOrder: z.coerce.number().int().nonnegative(),
  })).min(1),
});

export const listLinkQuerySchema = z.object({
  versionId: z.string().trim().min(1).optional(),
});

const baseTrackSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(1, 'Nombre requerido').max(120, 'Nombre demasiado largo'),
  type: z.nativeEnum(SongTrackType).default('OTHER'),
  instrument: z.string().trim().max(80).optional().nullable(),
  url: z.string().trim().optional().nullable(),
  provider: z.nativeEnum(TrackProvider).optional(),
  durationSec: z.coerce.number().int().nonnegative().optional().nullable(),
  volumeDefault: z.coerce.number().min(0).max(1).optional(),
  panDefault: z.coerce.number().min(-1).max(1).optional(),
  isPrimary: z.boolean().default(false),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

export const createTrackSchema = baseTrackSchema.superRefine((value, context) => {
  const provider = value.provider ?? 'EXTERNAL_URL';
  if ((provider === 'EXTERNAL_URL' || provider === 'OTHER') && !value.url) {
    context.addIssue({ code: 'custom', path: ['url'], message: 'URL requerida para pistas externas' });
    return;
  }

  if (value.url) {
    try {
      new URL(value.url);
    } catch {
      context.addIssue({ code: 'custom', path: ['url'], message: 'URL invalida' });
    }
  }
});

export const updateTrackSchema = baseTrackSchema.partial().superRefine((value, context) => {
  if (value.url) {
    try {
      new URL(value.url);
    } catch {
      context.addIssue({ code: 'custom', path: ['url'], message: 'URL invalida' });
    }
  }
});

export const reorderTrackSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  items: z.array(z.object({
    id: z.string().min(1),
    sortOrder: z.coerce.number().int().nonnegative(),
  })).min(1),
});

export const copyTracksSchema = z.object({
  sourceVersionId: z.string().trim().min(1, 'Version origen requerida'),
  targetVersionId: z.string().trim().min(1, 'Version destino requerida'),
});

const selectableSongFileCategories = [
  'LYRIC_PDF', 'CHORD_CHART', 'SHEET_MUSIC', 'LEAD_SHEET', 'PIANO_SCORE', 'GUITAR_SCORE',
  'BASS_SCORE', 'DRUM_SCORE', 'VOCAL_SCORE', 'IMAGE', 'DOCUMENT', 'PRESENTATION', 'MIDI',
  'MUSIC_XML', 'VIDEO', 'OTHER',
] as const;

export const songFileCategorySchema = z.enum(selectableSongFileCategories);

export const songFileUploadBodySchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  category: songFileCategorySchema.default('OTHER'),
  isPrimary: z.union([z.boolean(), z.string()]).optional().transform((value) => value === true || value === 'true'),
});

export const updateSongFileSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(1, 'Titulo requerido').max(160).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  category: songFileCategorySchema.optional(),
  isPrimary: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

export const reorderSongFilesSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  items: z.array(z.object({
    id: z.string().min(1),
    sortOrder: z.coerce.number().int().nonnegative(),
  })).min(1),
});

export const listSongFileQuerySchema = z.object({
  versionId: z.string().trim().min(1).optional(),
  category: songFileCategorySchema.optional(),
});

export const listTrackQuerySchema = z.object({
  versionId: z.string().trim().min(1).optional(),
  includeGeneral: z.union([z.boolean(), z.string()]).optional().transform((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value !== 'false';
    return true;
  }),
});

export const trackUploadBodySchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(1, 'Nombre requerido').max(120).optional(),
  type: z.nativeEnum(SongTrackType).default('OTHER'),
  instrument: z.string().trim().max(80).optional().nullable(),
  isPrimary: z.union([z.boolean(), z.string()]).optional().transform((value) => value === true || value === 'true'),
  durationSec: z.union([z.number(), z.string()]).optional().transform((value) => {
    if (value === undefined || value === '') return undefined;
    const next = Number(value);
    return Number.isFinite(next) ? Math.max(0, Math.trunc(next)) : undefined;
  }),
});

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
