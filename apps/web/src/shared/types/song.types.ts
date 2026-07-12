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
  versions?: SongVersion[];
};

export type SongDetail = SongSummary & {
  activeVersion?: SongVersion | null;
  versions: SongVersion[];
  tracks: Array<{ id: string; name: string; type: string; instrument?: string | null; durationSec?: number | null; url?: string | null; isPrimary: boolean; sortOrder: number }>;
  links: Array<{ id: string; provider: string; url: string; title?: string | null; isPrimary: boolean }>;
  songNotes: Array<{ id: string; content: string; visibility: string; createdAt: string }>;
  songFiles: Array<{ id: string; category: string; file: { id: string; name: string; type: string; sizeBytes?: number | null; url?: string | null; storageKey?: string | null } }>;
  files: Array<{ id: string; name: string; type: string; sizeBytes?: number | null; url?: string | null; storageKey?: string | null }>;
};

export type SongPayload = Omit<Partial<SongSummary>, 'tags'> & {
  tags?: string | string[];
  lyrics?: string;
  chords?: string;
  notes?: string;
  youtubeUrl?: string;
};
