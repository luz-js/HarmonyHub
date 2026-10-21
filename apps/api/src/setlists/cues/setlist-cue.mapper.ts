import type { SetlistCueType } from '@prisma/client';
import type { UserInstrumentRef } from '../../shared/user-instruments';
import { getCueCategory } from './setlist-cue.utils';

type MapperUserRef = { id: string; name: string };

type MapperParticipantRef = {
  id: string;
  status: string;
  membership: { id: string; user: { id: string; name: string; avatarUrl: string | null; instruments: UserInstrumentRef[] } };
};

type MapperAssignmentRef = { id: string; role: string; instrument: string | null };

type MapperCue = {
  id: string;
  setlistId: string;
  setlistItemId: string | null;
  type: SetlistCueType;
  phase: string;
  status: string;
  priority: string;
  title: string;
  description: string | null;
  offsetSec: number | null;
  durationSec: number | null;
  sortOrder: number;
  metadata: unknown;
  isOptional: boolean;
  isHidden: boolean;
  responsibleParticipant: MapperParticipantRef | null;
  responsibleAssignment: MapperAssignmentRef | null;
  createdBy: MapperUserRef | null;
  completedBy: MapperUserRef | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function mapSetlistCue(cue: MapperCue, timelinePositionSec: number | null = null) {
  return {
    id: cue.id,
    setlistId: cue.setlistId,
    setlistItemId: cue.setlistItemId,
    type: cue.type,
    category: getCueCategory(cue.type),
    phase: cue.phase,
    status: cue.status,
    priority: cue.priority,
    title: cue.title,
    description: cue.description,
    offsetSec: cue.offsetSec,
    durationSec: cue.durationSec,
    sortOrder: cue.sortOrder,
    metadata: (cue.metadata as Record<string, unknown> | null) ?? null,
    isOptional: cue.isOptional,
    isHidden: cue.isHidden,
    responsibleParticipant: cue.responsibleParticipant,
    responsibleAssignment: cue.responsibleAssignment,
    timelinePositionSec,
    createdBy: cue.createdBy,
    completedBy: cue.completedBy,
    completedAt: cue.completedAt ? cue.completedAt.toISOString() : null,
    createdAt: cue.createdAt.toISOString(),
    updatedAt: cue.updatedAt.toISOString(),
  };
}
