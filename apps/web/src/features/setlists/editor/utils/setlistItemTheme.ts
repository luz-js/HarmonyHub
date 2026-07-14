import { ArrowLeftRight, Coffee, Heart, Megaphone, Mic, Music2, Sparkles, Video, VolumeX, type LucideIcon } from 'lucide-react';
import type { SetlistItemType } from '../../../../shared/types';

export const TYPE_ICONS: Record<SetlistItemType, LucideIcon> = {
  SONG: Music2,
  SPEAKING: Mic,
  PRAYER: Heart,
  VIDEO: Video,
  ANNOUNCEMENT: Megaphone,
  SILENCE: VolumeX,
  TRANSITION: ArrowLeftRight,
  BREAK: Coffee,
  CUSTOM: Sparkles,
};

/** Colores por tipo (paleta HarmonyHub, no saturados) — ver clases .badge-* en index.css. */
export const TYPE_BADGE_CLASS: Record<SetlistItemType, string> = {
  SONG: 'badge-primary',
  PRAYER: 'badge-blue',
  VIDEO: 'badge-purple',
  ANNOUNCEMENT: 'badge-warning',
  BREAK: 'badge-neutral',
  SILENCE: 'badge-neutral',
  TRANSITION: 'badge-teal',
  CUSTOM: 'badge-orange',
  SPEAKING: 'badge-blue',
};

/** Border/bg suaves para el borde izquierdo de la card, coherentes con TYPE_BADGE_CLASS. */
export const TYPE_ACCENT_CLASS: Record<SetlistItemType, string> = {
  SONG: 'border-l-[var(--primary)]',
  PRAYER: 'border-l-[var(--secondary)]',
  VIDEO: 'border-l-[var(--accent)]',
  ANNOUNCEMENT: 'border-l-[var(--warning)]',
  BREAK: 'border-l-[var(--faint)]',
  SILENCE: 'border-l-[var(--faint)]',
  TRANSITION: 'border-l-[#5eead4]',
  CUSTOM: 'border-l-[#fdba74]',
  SPEAKING: 'border-l-[var(--secondary)]',
};
