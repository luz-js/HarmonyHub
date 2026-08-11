import type { MembershipRole } from './membership.types';

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

export type SetlistParticipantStatus = 'INVITED' | 'CONFIRMED' | 'DECLINED' | 'TENTATIVE' | 'NOT_REQUIRED';

export type SetlistMusicalRole =
  | 'MUSIC_DIRECTOR' | 'BAND_LEADER' | 'LEAD_VOCAL' | 'BACKING_VOCAL' | 'CHOIR'
  | 'ACOUSTIC_GUITAR' | 'ELECTRIC_GUITAR' | 'BASS' | 'DRUMS' | 'PERCUSSION' | 'PIANO' | 'KEYS' | 'ORGAN' | 'SYNTH' | 'STRINGS' | 'BRASS' | 'WOODWIND' | 'VIOLIN' | 'CELLO'
  | 'TRACKS' | 'CLICK' | 'PAD'
  | 'AUDIO_ENGINEER' | 'MONITOR_ENGINEER' | 'LIGHTING' | 'VIDEO'
  | 'SPEAKER' | 'PRAYER_LEADER' | 'ANNOUNCER'
  | 'OTHER';

export type AssignmentPreparationStatus = 'PENDING' | 'IN_PROGRESS' | 'READY' | 'NEEDS_REVIEW' | 'BLOCKED' | 'NOT_APPLICABLE';

export type SetlistParticipantMembership = {
  id: string;
  role: MembershipRole;
  instrument: string | null;
  user: { id: string; name: string; email?: string; avatarUrl: string | null };
};

export type SetlistParticipant = {
  id: string;
  status: SetlistParticipantStatus;
  generalRole: string | null;
  generalNote: string | null;
  membership: SetlistParticipantMembership;
  assignmentsCount: number;
  readyCount: number;
  pendingCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SetlistAssignmentParticipantRef = {
  id: string;
  status: SetlistParticipantStatus;
  membership: { id: string; instrument: string | null; user: { id: string; name: string; avatarUrl: string | null } };
};

export type SetlistAssignment = {
  id: string;
  setlistItemId: string;
  participantId: string;
  role: SetlistMusicalRole;
  instrument: string | null;
  label: string | null;
  isPrimary: boolean;
  isRequired: boolean;
  preparationStatus: AssignmentPreparationStatus;
  preparationNote: string | null;
  sortOrder: number;
  participant: SetlistAssignmentParticipantRef;
  createdAt: string;
  updatedAt: string;
};

export type SetlistRoleRequirement = {
  id: string;
  setlistItemId: string;
  role: SetlistMusicalRole;
  label: string | null;
  minimumCount: number;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SetlistItemCoverageStatus = 'COMPLETE' | 'PARTIAL' | 'EMPTY';

export type SetlistItemCoverage = {
  requiredRoles: number;
  coveredRoles: number;
  missingRoles: Array<{ role: SetlistMusicalRole; label: string | null; requiredCount: number; assignedCount: number }>;
  status: SetlistItemCoverageStatus;
};

export type SetlistTeamItemEntry = {
  itemId: string;
  assignments: SetlistAssignment[];
  requirements: SetlistRoleRequirement[];
  coverage: SetlistItemCoverage;
};

export type SetlistTeam = {
  participants: SetlistParticipant[];
  items: SetlistTeamItemEntry[];
  missingRolesCount: number;
};

export type AddSetlistParticipantInput = {
  membershipId: string;
  status?: SetlistParticipantStatus;
  generalRole?: string | null;
  generalNote?: string | null;
};

export type UpdateSetlistParticipantInput = Partial<Omit<AddSetlistParticipantInput, 'membershipId'>>;

export type CreateSetlistAssignmentInput = {
  participantId: string;
  role: SetlistMusicalRole;
  instrument?: string | null;
  label?: string | null;
  isPrimary?: boolean;
  isRequired?: boolean;
};

export type UpdateSetlistAssignmentInput = Partial<Omit<CreateSetlistAssignmentInput, 'participantId'>>;

export type UpdateAssignmentPreparationInput = {
  preparationStatus: AssignmentPreparationStatus;
  preparationNote?: string | null;
};

export type CopyAssignmentsMode = 'ALL' | 'MUSICIANS_ONLY' | 'VOCALS_ONLY' | 'TECH_ONLY';

export type CopySetlistAssignmentsInput = {
  sourceItemId: string;
  mode?: CopyAssignmentsMode;
  replaceExisting?: boolean;
};

export type CreateSetlistRoleRequirementInput = {
  role: SetlistMusicalRole;
  label?: string | null;
  minimumCount?: number;
  isRequired?: boolean;
};

export type UpdateSetlistRoleRequirementInput = Partial<Omit<CreateSetlistRoleRequirementInput, 'role'>>;

export type SetlistCueType =
  | 'COUNT_IN' | 'CLICK_START' | 'CLICK_STOP' | 'PAD_START' | 'PAD_STOP' | 'TRACK_START' | 'TRACK_STOP'
  | 'MUSIC_ENTRY' | 'MUSIC_STOP' | 'DYNAMICS_UP' | 'DYNAMICS_DOWN' | 'REPEAT_SECTION' | 'SKIP_SECTION' | 'MODULATION' | 'TEMPO_CHANGE' | 'FREE_TIME' | 'HOLD' | 'ENDING'
  | 'SPEAKING' | 'PRAYER' | 'ANNOUNCEMENT' | 'SILENCE'
  | 'VIDEO_START' | 'VIDEO_STOP' | 'SLIDE_CHANGE' | 'LYRICS_ON' | 'LYRICS_OFF'
  | 'LIGHTS_SCENE' | 'LIGHTS_BLACKOUT' | 'LIGHTS_FADE'
  | 'AUDIO_MUTE' | 'AUDIO_UNMUTE' | 'AUDIO_LEVEL' | 'MONITOR_CHANGE'
  | 'INSTRUMENT_CHANGE' | 'CAPO_CHANGE' | 'PATCH_CHANGE' | 'TUNING_CHANGE'
  | 'ENTER_STAGE' | 'EXIT_STAGE' | 'POSITION_CHANGE'
  | 'TIMER' | 'MARKER' | 'CUSTOM';

export type SetlistCuePhase = 'BEFORE' | 'DURING' | 'AFTER' | 'GLOBAL';

export type SetlistCueStatus = 'PENDING' | 'READY' | 'NEEDS_REVIEW' | 'BLOCKED' | 'COMPLETED' | 'SKIPPED';

export type SetlistCuePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type CueCategory = 'MUSICAL' | 'AUDIO' | 'TRACKS' | 'VIDEO' | 'LIGHTING' | 'SPEAKING' | 'LOGISTICS' | 'INSTRUMENT' | 'CUSTOM';

export type SetlistCueResponsibleParticipant = {
  id: string;
  status: SetlistParticipantStatus;
  membership: { id: string; instrument: string | null; user: { id: string; name: string; avatarUrl: string | null } };
};

export type SetlistCueResponsibleAssignment = { id: string; role: string; instrument: string | null };

export type SetlistCue = {
  id: string;
  setlistId: string;
  setlistItemId: string | null;
  type: SetlistCueType;
  category: CueCategory;
  phase: SetlistCuePhase;
  status: SetlistCueStatus;
  priority: SetlistCuePriority;
  title: string;
  description: string | null;
  offsetSec: number | null;
  durationSec: number | null;
  sortOrder: number;
  metadata: Record<string, unknown> | null;
  isOptional: boolean;
  isHidden: boolean;
  responsibleParticipant: SetlistCueResponsibleParticipant | null;
  responsibleAssignment: SetlistCueResponsibleAssignment | null;
  timelinePositionSec: number | null;
  createdBy: { id: string; name: string } | null;
  completedBy: { id: string; name: string } | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CueWarningCode =
  | 'CRITICAL_WITHOUT_RESPONSIBLE'
  | 'BLOCKED'
  | 'OFFSET_BEYOND_DURATION'
  | 'HIDDEN_ITEM'
  | 'DECLINED_RESPONSIBLE'
  | 'PROBABLE_DUPLICATE';

export type CueWarning = { cueId: string; code: CueWarningCode; message: string };

export type SetlistProductionCoverage = {
  total: number;
  ready: number;
  pending: number;
  needsReview: number;
  blocked: number;
  critical: number;
  withoutResponsible: number;
};

export type SetlistProductionByCategory = { category: CueCategory; total: number; pending: number; critical: number };

export type SetlistProductionByResponsible = {
  participantId: string | null;
  participantName: string;
  total: number;
  ready: number;
  pending: number;
  critical: number;
};

export type SetlistProduction = {
  cues: SetlistCue[];
  coverage: SetlistProductionCoverage;
  byCategory: SetlistProductionByCategory[];
  byResponsible: SetlistProductionByResponsible[];
  warnings: CueWarning[];
};

export type CreateSetlistCueInput = {
  setlistItemId?: string | null;
  type: SetlistCueType;
  phase?: SetlistCuePhase;
  priority?: SetlistCuePriority;
  title: string;
  description?: string | null;
  offsetSec?: number | null;
  durationSec?: number | null;
  metadata?: Record<string, unknown> | null;
  isOptional?: boolean;
  isHidden?: boolean;
  responsibleParticipantId?: string | null;
  responsibleAssignmentId?: string | null;
};

export type UpdateSetlistCueInput = Partial<Omit<CreateSetlistCueInput, 'setlistItemId'>>;

export type UpdateSetlistCueStatusInput = { status: SetlistCueStatus };

export type ReorderSetlistCuesInput = { setlistItemId: string | null; phase: SetlistCuePhase; cueIds: string[] };

export type CopySetlistCuesInput = {
  sourceItemId: string;
  phases?: SetlistCuePhase[];
  categories?: CueCategory[];
  replaceExisting?: boolean;
  includeResponsibles?: boolean;
};
