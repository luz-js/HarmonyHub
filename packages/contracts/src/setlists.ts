import { z } from 'zod';
import type { UserInstrumentRef } from './auth';
import {
  ASSIGNMENT_PREPARATION_STATUSES,
  COPY_ASSIGNMENTS_MODES,
  CUE_CATEGORIES,
  SETLIST_CUE_PHASES,
  SETLIST_CUE_PRIORITIES,
  SETLIST_CUE_STATUSES,
  SETLIST_CUE_TYPES,
  SETLIST_ITEM_TYPES,
  SETLIST_MUSICAL_ROLES,
  SETLIST_PARTICIPANT_STATUSES,
  SETLIST_STATUSES,
  type AssignmentPreparationStatus,
  type CueCategory,
  type MembershipRole,
  type SetlistCuePhase,
  type SetlistCuePriority,
  type SetlistCueStatus,
  type SetlistCueType,
  type SetlistItemType,
  type SetlistMusicalRole,
  type SetlistParticipantStatus,
  type SetlistStatus,
} from './enums';
import { booleanQueryParam } from './query';

/** Enteros: la API tambien acepta texto ("12") y lo convierte, pero la web los manda como number. */
const int = () => z.coerce.number<number>().int();

// ======================= Pedidos: setlists =======================

/** POST /api/setlists. Con `sourceTemplateId` se crea a partir de una plantilla. */
export const createSetlistSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(['DRAFT', 'READY', 'PUBLISHED']).optional(),
  sourceTemplateId: z.string().trim().min(1).optional().nullable(),
});
export type CreateSetlistInput = z.input<typeof createSetlistSchema>;
export type CreateSetlistData = z.output<typeof createSetlistSchema>;

/** PATCH /api/setlists/:id */
export const updateSetlistSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(SETLIST_STATUSES).optional(),
});
export type UpdateSetlistInput = z.input<typeof updateSetlistSchema>;
export type UpdateSetlistData = z.output<typeof updateSetlistSchema>;

/** POST /api/setlists/:id/save-as-template */
export const saveSetlistAsTemplateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).optional().nullable(),
});
export type SaveSetlistAsTemplateInput = z.input<typeof saveSetlistAsTemplateSchema>;
export type SaveSetlistAsTemplateData = z.output<typeof saveSetlistAsTemplateSchema>;

/** GET /api/setlists (query). Por defecto lista setlists, no plantillas. */
export const setlistListQuerySchema = z.object({
  status: z.enum(SETLIST_STATUSES).optional(),
  search: z.string().trim().min(1).optional(),
  includeArchived: booleanQueryParam(z.boolean().optional()),
  isTemplate: booleanQueryParam(z.boolean().optional().default(false)),
  page: int().min(1).optional().default(1),
  pageSize: int().min(1).max(100).optional().default(20),
});
export type SetlistListQueryData = z.output<typeof setlistListQuerySchema>;

// ======================= Pedidos: items =======================

const setlistItemFieldsSchema = z.object({
  type: z.enum(SETLIST_ITEM_TYPES).optional(),
  songId: z.string().trim().min(1).optional().nullable(),
  songVersionId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  estimatedSec: int().min(0).optional().nullable(),
  keyOverride: z.string().trim().min(1).max(10).optional().nullable(),
  bpmOverride: int().min(20).max(300).optional().nullable(),
  durationOverrideSec: int().min(0).optional().nullable(),
  capo: int().min(0).max(12).optional().nullable(),
  transitionNote: z.string().trim().max(2000).optional().nullable(),
  internalNote: z.string().trim().max(5000).optional().nullable(),
  includeClick: z.boolean().optional(),
  includePad: z.boolean().optional(),
  isOptional: z.boolean().optional(),
  isHidden: z.boolean().optional(),
});

/** POST /api/setlists/:setlistId/items. Una cancion necesita cancion y version; lo demas, un titulo. */
export const createSetlistItemSchema = setlistItemFieldsSchema
  .extend({ type: z.enum(SETLIST_ITEM_TYPES).default('SONG'), insertIndex: int().min(0).optional().nullable() })
  .refine((data) => data.type !== 'SONG' || (Boolean(data.songId) && Boolean(data.songVersionId)), {
    message: 'songId y songVersionId son requeridos para items de tipo SONG',
    path: ['songVersionId'],
  })
  .refine((data) => data.type === 'SONG' || Boolean(data.title && data.title.trim()), {
    message: 'title es requerido para items no musicales',
    path: ['title'],
  });
export type CreateSetlistItemInput = z.input<typeof createSetlistItemSchema>;
export type CreateSetlistItemData = z.output<typeof createSetlistItemSchema>;

/** PATCH /api/setlists/:setlistId/items/:itemId */
export const updateSetlistItemSchema = setlistItemFieldsSchema;
export type UpdateSetlistItemInput = z.input<typeof updateSetlistItemSchema>;
export type UpdateSetlistItemData = z.output<typeof updateSetlistItemSchema>;

/** PATCH /api/setlists/:setlistId/items/reorder: todos los items, en el orden nuevo. */
export const reorderSetlistItemsSchema = z.object({ itemIds: z.array(z.string().trim().min(1)).min(1) });
export type ReorderSetlistItemsInput = z.input<typeof reorderSetlistItemsSchema>;
export type ReorderSetlistItemsData = z.output<typeof reorderSetlistItemsSchema>;

// ======================= Pedidos: equipo =======================

/** POST /api/setlists/:setlistId/participants */
export const addSetlistParticipantSchema = z.object({
  membershipId: z.string().trim().min(1),
  status: z.enum(SETLIST_PARTICIPANT_STATUSES).optional(),
  generalRole: z.string().trim().max(120).optional().nullable(),
  generalNote: z.string().trim().max(2000).optional().nullable(),
});
export type AddSetlistParticipantInput = z.input<typeof addSetlistParticipantSchema>;
export type AddSetlistParticipantData = z.output<typeof addSetlistParticipantSchema>;

/** PATCH /api/setlists/:setlistId/participants/:participantId */
export const updateSetlistParticipantSchema = z.object({
  status: z.enum(SETLIST_PARTICIPANT_STATUSES).optional(),
  generalRole: z.string().trim().max(120).optional().nullable(),
  generalNote: z.string().trim().max(2000).optional().nullable(),
});
export type UpdateSetlistParticipantInput = z.input<typeof updateSetlistParticipantSchema>;
export type UpdateSetlistParticipantData = z.output<typeof updateSetlistParticipantSchema>;

/** POST /api/setlists/:setlistId/items/:itemId/assignments */
export const createSetlistAssignmentSchema = z.object({
  participantId: z.string().trim().min(1),
  role: z.enum(SETLIST_MUSICAL_ROLES),
  instrument: z.string().trim().max(80).optional().nullable(),
  label: z.string().trim().max(120).optional().nullable(),
  isPrimary: z.boolean().optional(),
  isRequired: z.boolean().optional(),
});
export type CreateSetlistAssignmentInput = z.input<typeof createSetlistAssignmentSchema>;
export type CreateSetlistAssignmentData = z.output<typeof createSetlistAssignmentSchema>;

/** PATCH /api/setlists/:setlistId/items/:itemId/assignments/:assignmentId */
export const updateSetlistAssignmentSchema = z.object({
  role: z.enum(SETLIST_MUSICAL_ROLES).optional(),
  instrument: z.string().trim().max(80).optional().nullable(),
  label: z.string().trim().max(120).optional().nullable(),
  isPrimary: z.boolean().optional(),
  isRequired: z.boolean().optional(),
});
export type UpdateSetlistAssignmentInput = z.input<typeof updateSetlistAssignmentSchema>;
export type UpdateSetlistAssignmentData = z.output<typeof updateSetlistAssignmentSchema>;

/**
 * PATCH .../assignments/:assignmentId/preparation. Excepcion: la API valida este cuerpo DESPUES de comprobar que
 * la asignacion es tuya (o que eres lider), para que alguien sin permiso reciba 403 aunque mande datos invalidos.
 */
export const updateAssignmentPreparationSchema = z.object({
  preparationStatus: z.enum(ASSIGNMENT_PREPARATION_STATUSES),
  preparationNote: z.string().trim().max(2000).optional().nullable(),
});
export type UpdateAssignmentPreparationInput = z.input<typeof updateAssignmentPreparationSchema>;
export type UpdateAssignmentPreparationData = z.output<typeof updateAssignmentPreparationSchema>;

/** POST .../items/:itemId/assignments/copy: copia las asignaciones de otro item. */
export const copySetlistAssignmentsSchema = z.object({
  sourceItemId: z.string().trim().min(1),
  mode: z.enum(COPY_ASSIGNMENTS_MODES).optional(),
  replaceExisting: z.boolean().optional(),
});
export type CopySetlistAssignmentsInput = z.input<typeof copySetlistAssignmentsSchema>;
export type CopySetlistAssignmentsData = z.output<typeof copySetlistAssignmentsSchema>;

/** POST .../items/:itemId/requirements */
export const createSetlistRoleRequirementSchema = z.object({
  role: z.enum(SETLIST_MUSICAL_ROLES),
  label: z.string().trim().max(120).optional().nullable(),
  minimumCount: int().min(1).max(20).optional(),
  isRequired: z.boolean().optional(),
});
export type CreateSetlistRoleRequirementInput = z.input<typeof createSetlistRoleRequirementSchema>;
export type CreateSetlistRoleRequirementData = z.output<typeof createSetlistRoleRequirementSchema>;

/** PATCH .../items/:itemId/requirements/:requirementId */
export const updateSetlistRoleRequirementSchema = z.object({
  label: z.string().trim().max(120).optional().nullable(),
  minimumCount: int().min(1).max(20).optional(),
  isRequired: z.boolean().optional(),
});
export type UpdateSetlistRoleRequirementInput = z.input<typeof updateSetlistRoleRequirementSchema>;
export type UpdateSetlistRoleRequirementData = z.output<typeof updateSetlistRoleRequirementSchema>;

// ======================= Pedidos: cues de produccion =======================

const cueFields = {
  type: z.enum(SETLIST_CUE_TYPES),
  phase: z.enum(SETLIST_CUE_PHASES).optional(),
  priority: z.enum(SETLIST_CUE_PRIORITIES).optional(),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(3000).optional().nullable(),
  offsetSec: int().min(-3600).max(86400).optional().nullable(),
  durationSec: int().min(0).max(86400).optional().nullable(),
  /** Depende del tipo de cue: la API lo valida aparte con el esquema de ese tipo. */
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  isOptional: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  responsibleParticipantId: z.string().trim().min(1).optional().nullable(),
  responsibleAssignmentId: z.string().trim().min(1).optional().nullable(),
};

/** POST /api/setlists/:setlistId/cues */
export const createSetlistCueSchema = z.object({ setlistItemId: z.string().trim().min(1).optional().nullable(), ...cueFields });
export type CreateSetlistCueInput = z.input<typeof createSetlistCueSchema>;
export type CreateSetlistCueData = z.output<typeof createSetlistCueSchema>;

/** PATCH /api/setlists/:setlistId/cues/:cueId (el item del cue no se cambia) */
export const updateSetlistCueSchema = z.object({ ...cueFields, type: cueFields.type.optional(), title: cueFields.title.optional() });
export type UpdateSetlistCueInput = z.input<typeof updateSetlistCueSchema>;
export type UpdateSetlistCueData = z.output<typeof updateSetlistCueSchema>;

/**
 * PATCH .../cues/:cueId/status. Excepcion: la API valida este cuerpo DESPUES de comprobar que eres responsable del
 * cue (o lider), para que alguien sin permiso reciba 403 aunque mande datos invalidos.
 */
export const updateSetlistCueStatusSchema = z.object({ status: z.enum(SETLIST_CUE_STATUSES) });
export type UpdateSetlistCueStatusInput = z.input<typeof updateSetlistCueStatusSchema>;
export type UpdateSetlistCueStatusData = z.output<typeof updateSetlistCueStatusSchema>;

/** PATCH /api/setlists/:setlistId/cues/reorder: los cues de un item y una fase, en el orden nuevo. */
export const reorderSetlistCuesSchema = z.object({
  setlistItemId: z.string().trim().min(1).nullable(),
  phase: z.enum(SETLIST_CUE_PHASES),
  cueIds: z.array(z.string().trim().min(1)).min(1),
});
export type ReorderSetlistCuesInput = z.input<typeof reorderSetlistCuesSchema>;
export type ReorderSetlistCuesData = z.output<typeof reorderSetlistCuesSchema>;

/** POST .../items/:itemId/cues/copy: copia los cues de otro item. */
export const copySetlistCuesSchema = z.object({
  sourceItemId: z.string().trim().min(1),
  phases: z.array(z.enum(SETLIST_CUE_PHASES)).optional(),
  categories: z.array(z.enum(CUE_CATEGORIES)).optional(),
  replaceExisting: z.boolean().optional(),
  includeResponsibles: z.boolean().optional(),
});
export type CopySetlistCuesInput = z.input<typeof copySetlistCuesSchema>;
export type CopySetlistCuesData = z.output<typeof copySetlistCuesSchema>;

// ======================= Respuestas =======================

export type SetlistItemEffectiveValues = {
  key: string | null;
  bpm: number | null;
  durationSec: number | null;
  capo: number | null;
};

/** `timeSignature` ("4/4", "6/8"...) lo usa el metronomo de Stage Mode; puede faltar en respuestas viejas. */
export type SetlistItemSongRef = { id: string; title: string; artist: string; coverUrl: string | null; timeSignature?: string | null };

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
  isTemplate: boolean;
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
  isTemplate: boolean;
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

export type SetlistParticipantMembership = {
  id: string;
  role: MembershipRole;
  /** `instruments`: lo que la persona sabe tocar segun su perfil (principal primero). */
  user: { id: string; name: string; email?: string; avatarUrl: string | null; instruments: UserInstrumentRef[] };
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
  membership: { id: string; user: { id: string; name: string; avatarUrl: string | null; instruments: UserInstrumentRef[] } };
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

export type SetlistCueResponsibleParticipant = {
  id: string;
  status: SetlistParticipantStatus;
  membership: { id: string; user: { id: string; name: string; avatarUrl: string | null; instruments: UserInstrumentRef[] } };
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
