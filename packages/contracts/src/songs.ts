import { z } from 'zod';
import {
  SELECTABLE_SONG_FILE_CATEGORIES,
  SONG_ACTIVITY_TYPES,
  SONG_COMMENT_TARGETS,
  SONG_ENTITY_TYPES,
  SONG_NOTE_VISIBILITIES,
  SONG_THREAD_STATUSES,
  SONG_TRACK_TYPES,
  TRACK_PROVIDERS,
  type RevisionSource,
  type SongActivityType,
  type SongCommentTarget,
  type SongEntityType,
  type SongFileCategory,
  type SongLinkProvider,
  type SongNoteVisibility,
  type SongThreadStatus,
  type SongTrackType,
  type TrackProvider,
} from './enums';

/** URL existe en Node y en los navegadores; se declara aqui para no depender de los tipos de ninguno de los dos. */
declare const URL: new (input: string) => unknown;

/** Numeros que tambien pueden llegar como texto (la API los convierte); la web los manda como number. */
const num = () => z.coerce.number<number>();

// ======================= Pedidos: canciones y versiones =======================

const sectionLineSchema = z.object({
  id: z.string().min(1),
  order: num().int().nonnegative(),
  chords: z.string().optional().default(''),
  lyrics: z.string().optional().default(''),
});

/** Letra y acordes por secciones (contentJson de una version). */
export const songContentSchema = z.object({
  version: z.literal(1).default(1),
  sections: z.array(z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    name: z.string().min(1),
    order: num().int().nonnegative(),
    chords: z.array(z.string()).optional(),
    lyrics: z.string().optional(),
    lines: z.array(sectionLineSchema).default([]),
    notes: z.string().optional(),
    collapsed: z.boolean().optional(),
  })).default([]),
});

const keySchema = z.string().regex(/^[A-G](#|b)?(m| minor| major| menor| mayor)?$/i, 'Tonalidad invalida');

/** POST /api/songs */
export const createSongSchema = z.object({
  title: z.string().min(1, 'Titulo requerido'),
  artist: z.string().min(1, 'Artista requerido'),
  album: z.string().optional().nullable(),
  year: num().int().positive().optional().nullable(),
  genre: z.string().optional().nullable(),
  originalKey: keySchema.default('C'),
  currentKey: keySchema.default('C'),
  bpm: num().int().positive().max(320).optional().nullable(),
  durationSec: num().int().positive().optional().nullable(),
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
export type CreateSongInput = z.input<typeof createSongSchema>;
export type CreateSongData = z.output<typeof createSongSchema>;

/** PATCH /api/songs/:id */
export const updateSongSchema = createSongSchema.partial();
export type UpdateSongInput = z.input<typeof updateSongSchema>;
export type UpdateSongData = z.output<typeof updateSongSchema>;

/** POST /api/songs/:id/versions */
export const createSongVersionSchema = z.object({
  name: z.string().min(1).default('Original'),
  key: keySchema.default('C'),
  bpm: num().int().positive().max(320).optional().nullable(),
  durationSec: num().int().positive().optional().nullable(),
  lyrics: z.string().optional().nullable(),
  chords: z.string().optional().nullable(),
  contentJson: songContentSchema.optional(),
  structureJson: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
});
export type CreateSongVersionInput = z.input<typeof createSongVersionSchema>;
export type CreateSongVersionData = z.output<typeof createSongVersionSchema>;

/** PATCH /api/songs/:id/versions/:versionId */
export const updateSongVersionSchema = createSongVersionSchema.partial();
export type UpdateSongVersionInput = z.input<typeof updateSongVersionSchema>;
export type UpdateSongVersionData = z.output<typeof updateSongVersionSchema>;

// ======================= Pedidos: enlaces =======================

export const createSongLinkSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(1, 'Titulo requerido').max(160, 'Titulo demasiado largo'),
  url: z.string().trim().min(1, 'URL requerida'),
  isPrimary: z.boolean().default(false),
});
export type CreateSongLinkInput = z.input<typeof createSongLinkSchema>;
export type CreateSongLinkData = z.output<typeof createSongLinkSchema>;

export const updateSongLinkSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(1, 'Titulo requerido').max(160, 'Titulo demasiado largo').optional(),
  url: z.string().trim().min(1, 'URL requerida').optional(),
  isPrimary: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: num().int().nonnegative().optional(),
});
export type UpdateSongLinkInput = z.input<typeof updateSongLinkSchema>;
export type UpdateSongLinkData = z.output<typeof updateSongLinkSchema>;

const reorderItems = z.array(z.object({ id: z.string().min(1), sortOrder: num().int().nonnegative() })).min(1);

export const reorderSongLinksSchema = z.object({ versionId: z.string().trim().min(1).optional().nullable(), items: reorderItems });
export type ReorderSongLinksInput = z.input<typeof reorderSongLinksSchema>;
export type ReorderSongLinksData = z.output<typeof reorderSongLinksSchema>;

export const songLinkListQuerySchema = z.object({ versionId: z.string().trim().min(1).optional() });
export type SongLinkListQueryData = z.output<typeof songLinkListQuerySchema>;

// ======================= Pedidos: pistas =======================

const baseTrackSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(1, 'Nombre requerido').max(120, 'Nombre demasiado largo'),
  type: z.enum(SONG_TRACK_TYPES).default('OTHER'),
  instrument: z.string().trim().max(80).optional().nullable(),
  url: z.string().trim().optional().nullable(),
  provider: z.enum(TRACK_PROVIDERS).optional(),
  durationSec: num().int().nonnegative().optional().nullable(),
  volumeDefault: num().min(0).max(1).optional(),
  panDefault: num().min(-1).max(1).optional(),
  isPrimary: z.boolean().default(false),
  sortOrder: num().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

/** POST /api/songs/:id/tracks: una pista externa (por URL). Las subidas usan trackUploadBodySchema. */
export const createSongTrackSchema = baseTrackSchema.superRefine((value, context) => {
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
export type CreateSongTrackInput = z.input<typeof createSongTrackSchema>;
export type CreateSongTrackData = z.output<typeof createSongTrackSchema>;

export const updateSongTrackSchema = baseTrackSchema.partial().superRefine((value, context) => {
  if (value.url) {
    try {
      new URL(value.url);
    } catch {
      context.addIssue({ code: 'custom', path: ['url'], message: 'URL invalida' });
    }
  }
});
export type UpdateSongTrackInput = z.input<typeof updateSongTrackSchema>;
export type UpdateSongTrackData = z.output<typeof updateSongTrackSchema>;

export const reorderSongTracksSchema = z.object({ versionId: z.string().trim().min(1).optional().nullable(), items: reorderItems });
export type ReorderSongTracksInput = z.input<typeof reorderSongTracksSchema>;
export type ReorderSongTracksData = z.output<typeof reorderSongTracksSchema>;

export const copySongTracksSchema = z.object({
  sourceVersionId: z.string().trim().min(1, 'Version origen requerida'),
  targetVersionId: z.string().trim().min(1, 'Version destino requerida'),
});
export type CopySongTracksInput = z.input<typeof copySongTracksSchema>;
export type CopySongTracksData = z.output<typeof copySongTracksSchema>;

export const songTrackListQuerySchema = z.object({
  versionId: z.string().trim().min(1).optional(),
  includeGeneral: z.union([z.boolean(), z.string()]).optional().transform((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value !== 'false';
    return true;
  }),
});
export type SongTrackListQueryData = z.output<typeof songTrackListQuerySchema>;

/** Campos de texto que acompanan una pista subida (formulario multipart): todo llega como texto. */
export const trackUploadBodySchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(1, 'Nombre requerido').max(120).optional(),
  type: z.enum(SONG_TRACK_TYPES).default('OTHER'),
  instrument: z.string().trim().max(80).optional().nullable(),
  isPrimary: z.union([z.boolean(), z.string()]).optional().transform((value) => value === true || value === 'true'),
  durationSec: z.union([z.number(), z.string()]).optional().transform((value) => {
    if (value === undefined || value === '') return undefined;
    const next = Number(value);
    return Number.isFinite(next) ? Math.max(0, Math.trunc(next)) : undefined;
  }),
});
export type TrackUploadBodyData = z.output<typeof trackUploadBodySchema>;

// ======================= Pedidos: archivos =======================

export const songFileCategorySchema = z.enum(SELECTABLE_SONG_FILE_CATEGORIES);

/** Campos de texto que acompanan un archivo subido (formulario multipart). */
export const songFileUploadBodySchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  category: songFileCategorySchema.default('OTHER'),
  isPrimary: z.union([z.boolean(), z.string()]).optional().transform((value) => value === true || value === 'true'),
});
export type SongFileUploadBodyData = z.output<typeof songFileUploadBodySchema>;

export const updateSongFileSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(1, 'Titulo requerido').max(160).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  category: songFileCategorySchema.optional(),
  isPrimary: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: num().int().nonnegative().optional(),
});
export type UpdateSongFileInput = z.input<typeof updateSongFileSchema>;
export type UpdateSongFileData = z.output<typeof updateSongFileSchema>;

export const reorderSongFilesSchema = z.object({ versionId: z.string().trim().min(1).optional().nullable(), items: reorderItems });
export type ReorderSongFilesInput = z.input<typeof reorderSongFilesSchema>;
export type ReorderSongFilesData = z.output<typeof reorderSongFilesSchema>;

/** GET /api/files: busqueda por titulo, nombre de archivo, cancion o artista, y filtro por categoria. */
export const organizationFilesQuerySchema = z.object({
  search: z.string().trim().max(120, 'La busqueda es demasiado larga').optional(),
  category: songFileCategorySchema.optional(),
  limit: z.coerce.number<number | string>().int().min(1).max(200).optional().default(100),
});
export type OrganizationFilesQueryData = z.output<typeof organizationFilesQuerySchema>;

export const songFileListQuerySchema = z.object({
  versionId: z.string().trim().min(1).optional(),
  category: songFileCategorySchema.optional(),
});
export type SongFileListQueryData = z.output<typeof songFileListQuerySchema>;

// ======================= Pedidos: notas, conversaciones, historial =======================

const MAX_NOTE_CONTENT_LENGTH = 10000;

export const createSongNoteSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().max(150, 'Titulo demasiado largo').optional(),
  content: z.string().trim().min(1, 'Contenido requerido').max(MAX_NOTE_CONTENT_LENGTH, 'Contenido demasiado largo'),
  visibility: z.enum(SONG_NOTE_VISIBILITIES).default('ORGANIZATION'),
  isPinned: z.boolean().optional(),
});
export type CreateSongNoteInput = z.input<typeof createSongNoteSchema>;
export type CreateSongNoteData = z.output<typeof createSongNoteSchema>;

/** PATCH de una nota. Excepcion: la API lo valida DESPUES de comprobar que puedes editarla (403 primero). */
export const updateSongNoteSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().max(150, 'Titulo demasiado largo').optional().nullable(),
  content: z.string().trim().min(1, 'Contenido requerido').max(MAX_NOTE_CONTENT_LENGTH, 'Contenido demasiado largo').optional(),
  visibility: z.enum(SONG_NOTE_VISIBILITIES).optional(),
});
export type UpdateSongNoteInput = z.input<typeof updateSongNoteSchema>;
export type UpdateSongNoteData = z.output<typeof updateSongNoteSchema>;

export const songNoteListQuerySchema = z.object({
  versionId: z.string().trim().min(1).optional(),
  visibility: z.enum(SONG_NOTE_VISIBILITIES).optional(),
  includeArchived: z.union([z.boolean(), z.string()]).optional().transform((value) => value === true || value === 'true'),
});
export type SongNoteListQueryData = z.output<typeof songNoteListQuerySchema>;

const MAX_COMMENT_LENGTH = 5000;

export const createSongThreadSchema = z.object({
  versionId: z.string().trim().min(1).optional().nullable(),
  targetType: z.enum(SONG_COMMENT_TARGETS).default('SONG'),
  targetRef: z.string().trim().max(200).optional().nullable(),
  title: z.string().trim().max(200, 'Titulo demasiado largo').optional(),
  content: z.string().trim().min(1, 'El comentario inicial es requerido').max(MAX_COMMENT_LENGTH, 'Comentario demasiado largo'),
  mentionedUserIds: z.array(z.string()).max(50).optional(),
});
export type CreateSongThreadInput = z.input<typeof createSongThreadSchema>;
export type CreateSongThreadData = z.output<typeof createSongThreadSchema>;

/** PATCH de una conversacion. Excepcion: la API lo valida DESPUES de comprobar que puedes editarla (403 primero). */
export const updateSongThreadSchema = z.object({
  title: z.string().trim().max(200, 'Titulo demasiado largo').optional().nullable(),
});
export type UpdateSongThreadInput = z.input<typeof updateSongThreadSchema>;
export type UpdateSongThreadData = z.output<typeof updateSongThreadSchema>;

export const songThreadListQuerySchema = z.object({
  versionId: z.string().trim().min(1).optional(),
  status: z.enum(SONG_THREAD_STATUSES).optional(),
  targetType: z.enum(SONG_COMMENT_TARGETS).optional(),
  targetRef: z.string().trim().min(1).optional(),
});
export type SongThreadListQueryData = z.output<typeof songThreadListQuerySchema>;

export const createSongCommentSchema = z.object({
  content: z.string().trim().min(1, 'Contenido requerido').max(MAX_COMMENT_LENGTH, 'Comentario demasiado largo'),
  mentionedUserIds: z.array(z.string()).max(50).optional(),
});
export type CreateSongCommentInput = z.input<typeof createSongCommentSchema>;
export type CreateSongCommentData = z.output<typeof createSongCommentSchema>;

/** PATCH de un comentario. Excepcion: la API lo valida DESPUES de comprobar que eres el autor (403 primero). */
export const updateSongCommentSchema = z.object({
  content: z.string().trim().min(1, 'Contenido requerido').max(MAX_COMMENT_LENGTH, 'Comentario demasiado largo'),
});
export type UpdateSongCommentInput = z.input<typeof updateSongCommentSchema>;
export type UpdateSongCommentData = z.output<typeof updateSongCommentSchema>;

/** POST .../revisions/:revisionNumber/restore */
export const restoreSongRevisionSchema = z.object({ reason: z.string().trim().max(300).optional() });
export type RestoreSongRevisionInput = z.input<typeof restoreSongRevisionSchema>;
export type RestoreSongRevisionData = z.output<typeof restoreSongRevisionSchema>;

/** GET /api/songs/:id/activity (query) */
export const songActivityListQuerySchema = z.object({
  action: z.enum(SONG_ACTIVITY_TYPES).optional(),
  entityType: z.enum(SONG_ENTITY_TYPES).optional(),
  versionId: z.string().trim().min(1).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  page: z.coerce.number<number | string>().int().positive().default(1),
  pageSize: z.coerce.number<number | string>().int().positive().max(100).default(20),
});
export type SongActivityListQueryData = z.output<typeof songActivityListQuerySchema>;

// ======================= Respuestas =======================

export type SongContent = {
  sections: Array<{
    name: string;
    chords?: string[];
    lyrics?: string;
    notes?: string;
    lines?: Array<{ chords?: string; lyrics?: string }>;
  }>;
};

export type SongVersion = {
  id: string;
  songId: string;
  name: string;
  key: string;
  bpm?: number | null;
  durationSec?: number | null;
  lyrics?: string | null;
  chords?: string | null;
  contentJson?: SongContent | null;
  structureJson?: Record<string, unknown> | null;
  notes?: string | null;
  isDefault: boolean;
};

export type SongLink = {
  id: string;
  songId: string;
  versionId: string | null;
  provider: SongLinkProvider;
  title: string | null;
  url: string;
  externalId: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  isPrimary: boolean;
  sortOrder: number;
  active: boolean;
  version?: { id: string; name: string; key: string; isDefault: boolean } | null;
  createdBy?: { id: string; name: string; avatarUrl?: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

export type SongTrack = {
  id: string;
  songId: string;
  versionId: string | null;
  name: string;
  type: SongTrackType;
  instrument?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  durationSec?: number | null;
  originalFileName?: string | null;
  url: string;
  provider: TrackProvider;
  volumeDefault: number;
  panDefault: number;
  isPrimary: boolean;
  sortOrder: number;
  active: boolean;
  version?: { id: string; name: string; key: string; isDefault: boolean } | null;
  uploadedBy?: { id: string; name: string; avatarUrl?: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

export type SongFile = {
  id: string;
  songId: string;
  versionId: string | null;
  category: SongFileCategory;
  title: string;
  description?: string | null;
  isPrimary: boolean;
  sortOrder: number;
  active: boolean;
  version?: { id: string; name: string; key: string; isDefault: boolean } | null;
  file: {
    id: string;
    name: string;
    originalName?: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    url: string;
    createdAt: string;
    uploadedBy?: { id: string; name: string; avatarUrl?: string | null } | null;
  };
  createdAt: string;
  updatedAt: string;
};

/** Fila de GET /api/files: un archivo de cancion con la cancion a la que pertenece (pagina Archivos). */
export type OrganizationFile = SongFile & { song: { id: string; title: string; artist: string } };

export type SongSummary = {
  id: string;
  organizationId: string;
  title: string;
  artist: string;
  originalKey: string;
  currentKey: string;
  bpm?: number | null;
  durationSec?: number | null;
  album?: string | null;
  year?: number | null;
  genre?: string | null;
  timeSignature?: string | null;
  language?: string | null;
  isFavorite: boolean;
  coverUrl?: string | null;
  tags: string[];
  status: string;
  updatedAt?: string;
  /** Solo presente en el listado resumido; SongDetail trae `versions` completo por separado. */
  defaultVersion?: { id: string; name: string; key: string; bpm: number | null; durationSec: number | null } | null;
  versionsCount?: number;
  tracksCount?: number;
  filesCount?: number;
};

export type SongDetail = SongSummary & {
  activeVersion?: SongVersion | null;
  versions: SongVersion[];
  tracks: SongTrack[];
  links: SongLink[];
  songFiles: SongFile[];
  files: Array<{ id: string; name: string; originalName?: string | null; type: string; mimeType?: string | null; sizeBytes?: number | null; createdAt: string }>;
};

export type SongNote = {
  id: string;
  songId: string;
  versionId: string | null;
  title: string | null;
  content: string;
  visibility: SongNoteVisibility;
  isPinned: boolean;
  isArchived: boolean;
  version?: { id: string; name: string; key: string; isDefault: boolean } | null;
  author?: { id: string; name: string; avatarUrl?: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

export type SongCollaborationUserRef = { id: string; name: string; avatarUrl?: string | null };

export type SongComment = {
  id: string;
  threadId: string;
  content: string | null;
  isDeleted: boolean;
  editedAt: string | null;
  author: SongCollaborationUserRef | null;
  mentionedUserIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type SongCommentThread = {
  id: string;
  songId: string;
  versionId: string | null;
  targetType: SongCommentTarget;
  targetRef: string | null;
  title: string | null;
  status: SongThreadStatus;
  resolvedAt: string | null;
  resolvedBy?: SongCollaborationUserRef | null;
  createdBy?: SongCollaborationUserRef | null;
  version?: { id: string; name: string; key: string; isDefault: boolean } | null;
  commentsCount: number;
  lastComment?: { id: string; content: string | null; isDeleted: boolean; author: SongCollaborationUserRef | null; createdAt: string } | null;
  comments?: SongComment[];
  createdAt: string;
  updatedAt: string;
};

export type SongActivity = {
  id: string;
  songId: string;
  versionId: string | null;
  action: SongActivityType;
  entityType: SongEntityType;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  actor: { id: string; name: string; avatarUrl?: string | null } | null;
  version?: { id: string; name: string } | null;
  createdAt: string;
};

export type SongActivityPage = {
  items: SongActivity[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type SongVersionRevision = {
  id: string;
  songId: string;
  versionId: string;
  revisionNumber: number;
  reason: string | null;
  source: RevisionSource;
  name: string;
  key: string | null;
  bpm: number | null;
  durationSec: number | null;
  contentJson?: SongContent | null;
  structureJson?: Record<string, unknown> | null;
  lyrics: string | null;
  chords: string | null;
  notes: string | null;
  createdBy: { id: string; name: string; avatarUrl?: string | null } | null;
  createdAt: string;
};

export type SongRevisionScalarChange = { field: string; before: unknown; after: unknown };

export type SongRevisionSectionChange = {
  sectionId: string;
  sectionName: string;
  linesAdded: number;
  linesRemoved: number;
  lyricsChanged: boolean;
  chordsChanged: boolean;
};

export type SongRevisionDiff = {
  scalarChanges: SongRevisionScalarChange[];
  sectionsAdded: string[];
  sectionsRemoved: string[];
  sectionsChanged: SongRevisionSectionChange[];
};

export type SongRevisionDiffResult = {
  before: { revisionNumber: number; label: string };
  after: { revisionNumber: number | null; label: string };
  diff: SongRevisionDiff;
};
