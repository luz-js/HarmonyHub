import { Lock, ShieldCheck, Users } from 'lucide-react';
import type { SongNoteVisibility } from '../../../../shared/types';
import { noteVisibilityLabels } from './note.utils';

const ICON_BY_VISIBILITY: Record<SongNoteVisibility, typeof Lock> = {
  PRIVATE: Lock,
  ORGANIZATION: Users,
  LEADERS_ONLY: ShieldCheck,
};

export function NoteVisibilityBadge({ visibility }: { visibility: SongNoteVisibility }) {
  const Icon = ICON_BY_VISIBILITY[visibility];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#30333A] bg-[#1C2436] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8FB4FF]">
      <Icon className="h-3.5 w-3.5" />
      {noteVisibilityLabels[visibility]}
    </span>
  );
}
