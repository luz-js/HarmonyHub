import type { SetlistItem, SetlistItemType, SetlistStatus } from '../../../shared/types';
import { formatBpm, formatDuration, formatKey } from '../../../shared/utils/format';

export function getCurrentUser(): { id?: string; role?: string } {
  try {
    return JSON.parse(localStorage.getItem('hh_user') || '{}');
  } catch {
    return {};
  }
}

/** OWNER/ADMIN/LEADER pueden crear/editar/gestionar; el backend es la fuente de verdad, esto solo evita mostrar acciones inutiles. */
export function canManageSetlistsClientSide(role?: string) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'LEADER';
}

export const setlistItemTypeLabels: Record<SetlistItemType, string> = {
  SONG: 'Canción',
  SPEAKING: 'Hablar',
  PRAYER: 'Oración',
  VIDEO: 'Video',
  ANNOUNCEMENT: 'Aviso',
  SILENCE: 'Silencio',
  TRANSITION: 'Transición',
  BREAK: 'Intermedio',
  CUSTOM: 'Personalizado',
};

export const SETLIST_ITEM_TYPE_OPTIONS: Array<[SetlistItemType, string]> = [
  ['SONG', setlistItemTypeLabels.SONG],
  ['SPEAKING', setlistItemTypeLabels.SPEAKING],
  ['PRAYER', setlistItemTypeLabels.PRAYER],
  ['VIDEO', setlistItemTypeLabels.VIDEO],
  ['ANNOUNCEMENT', setlistItemTypeLabels.ANNOUNCEMENT],
  ['SILENCE', setlistItemTypeLabels.SILENCE],
  ['TRANSITION', setlistItemTypeLabels.TRANSITION],
  ['BREAK', setlistItemTypeLabels.BREAK],
  ['CUSTOM', setlistItemTypeLabels.CUSTOM],
];

export function getSetlistItemTypeLabel(type: SetlistItemType) {
  return setlistItemTypeLabels[type] || type;
}

export const setlistStatusLabels: Record<SetlistStatus, string> = {
  DRAFT: 'Borrador',
  READY: 'Listo',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
};

export function getSetlistStatusLabel(status: SetlistStatus) {
  return setlistStatusLabels[status] || status;
}

export function formatSetlistDuration(seconds?: number | null) {
  return formatDuration(seconds);
}

export function resolveSetlistItemDisplayMetadata(item: SetlistItem) {
  return {
    typeLabel: getSetlistItemTypeLabel(item.type),
    keyLabel: formatKey(item.effective.key),
    bpmLabel: formatBpm(item.effective.bpm),
    durationLabel: formatDuration(item.effective.durationSec),
    subtitle: item.type === 'SONG' ? item.song?.artist || '' : item.description || '',
  };
}

export function canMoveItemUp(index: number) {
  return index > 0;
}

export function canMoveItemDown(index: number, total: number) {
  return index >= 0 && index < total - 1;
}

/** Devuelve la lista completa de IDs con `index` y su vecino intercambiados, lista para /items/reorder. */
export function swapItemOrder(items: Array<{ id: string }>, index: number, direction: 'up' | 'down'): string[] {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  const ids = items.map((item) => item.id);
  if (targetIndex < 0 || targetIndex >= ids.length) return ids;
  [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
  return ids;
}

/** Opciones para el selector "Partir desde plantilla" del dialogo de creacion. */
export function toTemplateOptions(setlists: Array<{ id: string; name: string; description: string | null; isTemplate: boolean }>) {
  return setlists.filter((setlist) => setlist.isTemplate).map(({ id, name, description }) => ({ id, name, description }));
}

/** Normaliza el borrador del dialogo; devuelve null si falta el nombre. Un setlist desde plantilla siempre nace en borrador. */
export function buildCreateSetlistInput(draft: { name: string; description: string; sourceTemplateId?: string | null }) {
  const name = draft.name.trim();
  if (!name) return null;
  const description = draft.description.trim() || undefined;
  return draft.sourceTemplateId ? { name, description, sourceTemplateId: draft.sourceTemplateId } : { name, description };
}
