import type { SongSectionType } from '../../types/song-content.types';
import { sectionTypeLabels } from '../../utils';

const accents: Record<SongSectionType, string> = {
  INTRO: 'border-cyan-400/30 text-cyan-200',
  VERSE: 'border-sky-400/30 text-sky-200',
  PRE_CHORUS: 'border-teal-400/30 text-teal-200',
  CHORUS: 'border-emerald-400/40 text-primary',
  BRIDGE: 'border-violet-300/30 text-violet-100',
  INTERLUDE: 'border-blue-300/30 text-blue-100',
  INSTRUMENTAL: 'border-warning/30 text-warning-soft',
  SOLO: 'border-orange-300/30 text-orange-100',
  ENDING: 'border-rose-300/30 text-rose-100',
  CUSTOM: 'border-slate-300/30 text-slate-100',
};

export function SectionTypeBadge({ type }: { type: SongSectionType }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${accents[type]}`}>{sectionTypeLabels[type]}</span>;
}
