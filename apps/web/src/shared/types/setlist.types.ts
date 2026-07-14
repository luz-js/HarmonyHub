export type SetlistStatus = 'DRAFT' | 'READY' | 'PUBLISHED' | 'ARCHIVED';

export type SetlistItemType = 'SONG' | 'SPEAKING' | 'PRAYER' | 'VIDEO' | 'ANNOUNCEMENT' | 'SILENCE' | 'TRANSITION' | 'BREAK' | 'CUSTOM';

export type SetlistItemEffectiveValues = {
  key: string | null;
  bpm: number | null;
  durationSec: number | null;
  capo: number | null;
};

export type SetlistItemSongRef = { id: string; title: string; artist: string; coverUrl: string | null };

export type SetlistItemVersionRef = { id: string; name: string; key: string; bpm: number | null; durationSec: number | null; isDefault: boolean };

export type SetlistItem = {
  id: string;
  type: SetlistItemType;
  title: string;
  description: string | null;
  order: number;
  songId: string | null;
  songVersionId: string | null;
  estimatedSec: number | null;
  keyOverride: string | null;
  bpmOverride: number | null;
  durationOverrideSec: number | null;
  capo: number | null;
  transitionNote: string | null;
  internalNote: string | null;
  includeClick: boolean;
  includePad: boolean;
  isOptional: boolean;
  isHidden: boolean;
  effective: SetlistItemEffectiveValues;
  song?: SetlistItemSongRef | null;
  songVersion?: SetlistItemVersionRef | null;
};

export type SetlistSummary = {
  id: string;
  name: string;
  description: string | null;
  status: SetlistStatus;
  estimatedSec: number;
  itemCount: number;
  songsCount: number;
  nonSongItemsCount: number;
  createdBy?: { id: string; name: string } | null;
  updatedAt: string;
};

export type SetlistDetail = {
  id: string;
  name: string;
  description: string | null;
  status: SetlistStatus;
  estimatedSec: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  items: SetlistItem[];
};

export type SetlistListResponse = {
  items: SetlistSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreateSetlistItemInput = {
  type: SetlistItemType;
  songId?: string | null;
  songVersionId?: string | null;
  title?: string;
  description?: string | null;
  estimatedSec?: number | null;
  keyOverride?: string | null;
  bpmOverride?: number | null;
  durationOverrideSec?: number | null;
  capo?: number | null;
  transitionNote?: string | null;
  internalNote?: string | null;
  includeClick?: boolean;
  includePad?: boolean;
  isOptional?: boolean;
  isHidden?: boolean;
  insertIndex?: number | null;
};

export type UpdateSetlistItemInput = Partial<CreateSetlistItemInput>;
