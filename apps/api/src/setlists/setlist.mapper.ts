import type { SetlistItemType, SetlistStatus } from '@prisma/client';
import { resolveSetlistItemEffectiveValues } from './setlist.utils';

type MapperSetlistItem = {
  id: string;
  type: SetlistItemType;
  title: string;
  description: string | null;
  order: number;
  songId: string | null;
  songVersionId: string | null;
  keyOverride: string | null;
  bpmOverride: number | null;
  durationOverrideSec: number | null;
  estimatedSec: number | null;
  capo: number | null;
  transitionNote: string | null;
  internalNote: string | null;
  includeClick: boolean;
  includePad: boolean;
  isOptional: boolean;
  isHidden: boolean;
  song: { id: string; title: string; artist: string; coverUrl: string | null } | null;
  songVersion: { id: string; name: string; key: string; bpm: number | null; durationSec: number | null; isDefault: boolean } | null;
};

type MapperSetlistSummary = {
  id: string;
  name: string;
  description: string | null;
  status: SetlistStatus;
  isTemplate: boolean;
  estimatedSec: number;
  itemCount: number;
  updatedAt: Date;
  createdBy: { id: string; name: string } | null;
  items: Array<{ type: string }>;
};

type MapperSetlistDetail = {
  id: string;
  name: string;
  description: string | null;
  status: SetlistStatus;
  isTemplate: boolean;
  estimatedSec: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
  items: MapperSetlistItem[];
};

export function mapSetlistItemDetail(item: MapperSetlistItem) {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.description,
    order: item.order,
    songId: item.songId,
    songVersionId: item.songVersionId,
    estimatedSec: item.estimatedSec,
    keyOverride: item.keyOverride,
    bpmOverride: item.bpmOverride,
    durationOverrideSec: item.durationOverrideSec,
    capo: item.capo,
    transitionNote: item.transitionNote,
    internalNote: item.internalNote,
    includeClick: item.includeClick,
    includePad: item.includePad,
    isOptional: item.isOptional,
    isHidden: item.isHidden,
    effective: resolveSetlistItemEffectiveValues(item, item.songVersion),
    song: item.song,
    songVersion: item.songVersion,
  };
}

export function mapSetlistSummary(setlist: MapperSetlistSummary) {
  const songsCount = setlist.items.filter((item) => item.type === 'SONG').length;
  return {
    id: setlist.id,
    name: setlist.name,
    description: setlist.description,
    status: setlist.status,
    isTemplate: setlist.isTemplate,
    estimatedSec: setlist.estimatedSec,
    itemCount: setlist.itemCount,
    songsCount,
    nonSongItemsCount: setlist.items.length - songsCount,
    createdBy: setlist.createdBy,
    updatedAt: setlist.updatedAt.toISOString(),
  };
}

export function mapSetlistDetail(setlist: MapperSetlistDetail) {
  return {
    id: setlist.id,
    name: setlist.name,
    description: setlist.description,
    status: setlist.status,
    isTemplate: setlist.isTemplate,
    estimatedSec: setlist.estimatedSec,
    itemCount: setlist.itemCount,
    createdAt: setlist.createdAt.toISOString(),
    updatedAt: setlist.updatedAt.toISOString(),
    items: setlist.items.map(mapSetlistItemDetail),
  };
}
