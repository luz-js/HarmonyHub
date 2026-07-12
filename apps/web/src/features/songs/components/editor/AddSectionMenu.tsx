import type { SongSectionType } from '../../types/song-content.types';
import { sectionTypeLabels } from '../../utils';

const sectionTypes: SongSectionType[] = ['INTRO', 'VERSE', 'PRE_CHORUS', 'CHORUS', 'BRIDGE', 'INTERLUDE', 'INSTRUMENTAL', 'SOLO', 'ENDING', 'CUSTOM'];

export function AddSectionMenu({ onAdd, compact = false }: { onAdd: (type: SongSectionType) => void; compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {sectionTypes.map((type) => (
        <button key={type} type="button" className={compact ? 'btn-ghost px-3 py-2 text-xs' : 'btn-ghost'} onClick={() => onAdd(type)}>
          {sectionTypeLabels[type]}
        </button>
      ))}
    </div>
  );
}
