import type { LucideIcon } from 'lucide-react';
import type { SetlistItem } from '../../../../shared/types';
import { resolveSetlistItemDisplayMetadata } from '../../utils';
import { TYPE_BADGE_CLASS, TYPE_ICONS } from './setlistItemTheme';

export type DragPreviewData = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  durationLabel: string;
  keyLabel?: string;
  bpmLabel?: string;
  badgeClass: string;
};

/** Shape de datos para la tarjeta flotante del overlay de drag — nunca un rectangulo vacio. */
export function buildDragPreview(item: SetlistItem): DragPreviewData {
  const meta = resolveSetlistItemDisplayMetadata(item);
  return {
    icon: TYPE_ICONS[item.type],
    title: item.title,
    subtitle: meta.subtitle || meta.typeLabel,
    durationLabel: meta.durationLabel,
    keyLabel: item.type === 'SONG' ? meta.keyLabel : undefined,
    bpmLabel: item.type === 'SONG' ? meta.bpmLabel : undefined,
    badgeClass: TYPE_BADGE_CLASS[item.type],
  };
}
