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

export type SongLinkProvider =
  | 'YOUTUBE'
  | 'SPOTIFY'
  | 'APPLE_MUSIC'
  | 'SOUNDCLOUD'
  | 'VIMEO'
  | 'BANDCAMP'
  | 'WEBSITE'
  | 'OTHER';

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

export type SongTrackType =
  | 'FULL_TRACK'
  | 'BACKING_TRACK'
  | 'CLICK'
  | 'PAD'
  | 'DRUMS'
  | 'BASS'
  | 'GUITAR'
  | 'KEYS'
  | 'VOCALS'
  | 'CHOIR'
  | 'GUIDE'
  | 'REFERENCE'
  | 'OTHER';

export type TrackProvider =
  | 'UPLOAD'
  | 'EXTERNAL_URL'
  | 'LOCAL'
  | 'S3'
  | 'R2'
  | 'SUPABASE'
  | 'OTHER';

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

export type SongFileCategory =
  | 'LYRIC_PDF'
  | 'CHORD_CHART'
  | 'SHEET_MUSIC'
  | 'LEAD_SHEET'
  | 'PIANO_SCORE'
  | 'GUITAR_SCORE'
  | 'BASS_SCORE'
  | 'DRUM_SCORE'
  | 'VOCAL_SCORE'
  | 'IMAGE'
  | 'DOCUMENT'
  | 'PRESENTATION'
  | 'MIDI'
  | 'MUSIC_XML'
  | 'VIDEO'
  | 'OTHER'
  // Categorias legacy: solo aparecen en filas existentes, no seleccionables al crear.
  | 'AUDIO'
  | 'STEM'
  | 'BACKING_TRACK';

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

export type SongNoteVisibility = 'PRIVATE' | 'ORGANIZATION' | 'LEADERS_ONLY';

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

export type SongCommentTarget = 'SONG' | 'VERSION' | 'SECTION' | 'TRACK' | 'FILE' | 'LINK';
export type SongThreadStatus = 'OPEN' | 'RESOLVED';

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

export type SongPayload = Omit<Partial<SongSummary>, 'tags'> & {
  tags?: string | string[];
  lyrics?: string;
  chords?: string;
  notes?: string;
  youtubeUrl?: string;
};

export type SongActivityType =
  | 'SONG_CREATED' | 'SONG_UPDATED' | 'SONG_ARCHIVED' | 'FAVORITE_CHANGED'
  | 'VERSION_CREATED' | 'VERSION_UPDATED' | 'VERSION_DELETED' | 'VERSION_SET_DEFAULT' | 'VERSION_TRANSPOSED' | 'VERSION_RESTORED'
  | 'TRACK_ADDED' | 'TRACK_UPDATED' | 'TRACK_DELETED' | 'TRACK_SET_PRIMARY'
  | 'LINK_ADDED' | 'LINK_UPDATED' | 'LINK_DELETED' | 'LINK_SET_PRIMARY'
  | 'FILE_ADDED' | 'FILE_UPDATED' | 'FILE_DELETED' | 'FILE_SET_PRIMARY'
  | 'NOTE_CREATED' | 'NOTE_UPDATED' | 'NOTE_ARCHIVED' | 'NOTE_DELETED' | 'NOTE_PINNED'
  | 'THREAD_CREATED' | 'THREAD_RESOLVED' | 'THREAD_REOPENED' | 'COMMENT_ADDED';

export type SongEntityType = 'SONG' | 'VERSION' | 'TRACK' | 'LINK' | 'FILE' | 'NOTE' | 'THREAD' | 'COMMENT';

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

export type RevisionSource = 'MANUAL_SAVE' | 'TRANSPOSE' | 'RESTORE' | 'IMPORT' | 'MIGRATION';

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
