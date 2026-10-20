import { BadRequestException } from '@nestjs/common';
import type { SetlistItemType, SetlistStatus } from '@prisma/client';

export interface SetlistItemEffectiveValues {
  key: string | null;
  bpm: number | null;
  durationSec: number | null;
  capo: number | null;
}

type EffectiveSourceItem = {
  keyOverride?: string | null;
  bpmOverride?: number | null;
  durationOverrideSec?: number | null;
  estimatedSec?: number | null;
  capo?: number | null;
};

type EffectiveSourceVersion = { key?: string | null; bpm?: number | null; durationSec?: number | null } | null | undefined;

/**
 * Los overrides son especificos del Setlist y nunca modifican la SongVersion.
 * `durationSec` da prioridad a `estimatedSec` (snapshot tomado al agregar el item)
 * sobre el valor en vivo de la version: es intencional, ver docs/setlists-module.md.
 */
export function resolveSetlistItemEffectiveValues(item: EffectiveSourceItem, songVersion?: EffectiveSourceVersion): SetlistItemEffectiveValues {
  return {
    key: item.keyOverride ?? songVersion?.key ?? null,
    bpm: item.bpmOverride ?? songVersion?.bpm ?? null,
    durationSec: item.durationOverrideSec ?? item.estimatedSec ?? songVersion?.durationSec ?? null,
    capo: item.capo ?? null,
  };
}

const NON_SONG_RESET_FIELDS = {
  songId: null,
  songVersionId: null,
  keyOverride: null,
  bpmOverride: null,
  capo: null,
  includeClick: false,
  includePad: false,
} as const;

/** Evita datos incoherentes: los bloques no musicales nunca conservan campos exclusivos de SONG. */
export function normalizeSetlistItemInput<T extends Record<string, unknown>>(type: SetlistItemType, input: T): T {
  if (type === 'SONG') return input;
  return { ...input, ...NON_SONG_RESET_FIELDS };
}

export class InvalidSetlistStatusTransitionError extends Error {}

const ALLOWED_SETLIST_STATUS_TRANSITIONS: Record<SetlistStatus, SetlistStatus[]> = {
  DRAFT: ['READY', 'ARCHIVED'],
  READY: ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
  PUBLISHED: ['READY', 'ARCHIVED'],
  ARCHIVED: ['DRAFT'],
};

/** Unica fuente de verdad para transiciones de estado validas; no permite valores arbitrarios. */
export function assertSetlistStatusTransition(from: SetlistStatus, to: SetlistStatus) {
  if (from === to) return;
  if (!ALLOWED_SETLIST_STATUS_TRANSITIONS[from].includes(to)) {
    throw new InvalidSetlistStatusTransitionError(`No se puede pasar de ${from} a ${to}`);
  }
}

export class InvalidSetlistTemplateActionError extends Error {}

export type SetlistTemplateAction = 'publish' | 'archive' | 'status-change';

const TEMPLATE_ACTION_MESSAGES: Record<SetlistTemplateAction, string> = {
  publish: 'Las plantillas no se publican',
  archive: 'Las plantillas no se archivan',
  'status-change': 'Las plantillas no usan flujo de publicacion ni archivado',
};

/** Las plantillas son estructuras reutilizables: nunca entran al ciclo DRAFT -> READY -> PUBLISHED -> ARCHIVED. */
export function assertTemplateAllowsAction(isTemplate: boolean, action: SetlistTemplateAction) {
  if (isTemplate) throw new InvalidSetlistTemplateActionError(TEMPLATE_ACTION_MESSAGES[action]);
}

/** Query params llegan como string: "false" debe ser false (z.coerce.boolean lo convertiria en true). */
export function parseBooleanQueryParam(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
}

/** Valida que la lista de reordenamiento sea exactamente el conjunto de items existentes, sin duplicados ni faltantes. */
export function assertReorderPayloadValid(itemIds: string[], existingIds: string[]) {
  if (itemIds.length === 0) throw new BadRequestException('La lista de reordenamiento no puede estar vacia');
  if (new Set(itemIds).size !== itemIds.length) throw new BadRequestException('La lista de reordenamiento tiene IDs duplicados');

  const existingSet = new Set(existingIds);
  const providedSet = new Set(itemIds);
  const missing = existingIds.filter((id) => !providedSet.has(id));
  const unknown = itemIds.filter((id) => !existingSet.has(id));

  if (missing.length > 0 || unknown.length > 0) {
    throw new BadRequestException('La lista de reordenamiento debe incluir exactamente los items del setlist');
  }
}

/**
 * Calcula el orden final de ids tras insertar `newItemId` en una posicion arbitraria.
 * `existingIds` debe ser el orden actual (recien creado, `newItemId` normalmente al final).
 * Si `insertIndex` es null/undefined, no reordena (preserva el append-al-final existente).
 */
export function computeInsertOrder(existingIds: string[], newItemId: string, insertIndex?: number | null): string[] {
  if (insertIndex == null) return existingIds;

  const withoutNew = existingIds.filter((id) => id !== newItemId);
  const clampedIndex = Math.max(0, Math.min(insertIndex, withoutNew.length));
  withoutNew.splice(clampedIndex, 0, newItemId);
  return withoutNew;
}

type EstimatedSecSourceItem = {
  isHidden: boolean;
  durationOverrideSec?: number | null;
  estimatedSec?: number | null;
  songVersion?: { durationSec?: number | null } | null;
};

/** Suma la duracion efectiva de los items visibles (isHidden=false); usado por recalculateSetlistStats. */
export function calculateSetlistEstimatedSec(items: EstimatedSecSourceItem[]): number {
  return items
    .filter((item) => !item.isHidden)
    .reduce((total, item) => total + (item.durationOverrideSec ?? item.estimatedSec ?? item.songVersion?.durationSec ?? 0), 0);
}
