import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, GripVertical } from 'lucide-react';
import type { SetlistItem } from '../../../../shared/types';
import type { TeamSummary } from '../../assignments/utils/teamSummary';
import { TYPE_ACCENT_CLASS } from '../utils/setlistItemTheme';
import { BlockSetlistCard } from './BlockSetlistCard';
import { CurrentPositionIndicator } from './CurrentPositionIndicator';
import { SongSetlistCard } from './SongSetlistCard';

function SetlistCardImpl({
  item,
  startSec,
  isSelected,
  onSelect,
  isExpanded,
  onToggleExpand,
  workspaceId,
  teamSummary,
}: {
  item: SetlistItem;
  startSec: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  workspaceId: string;
  teamSummary?: TeamSummary | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 rounded-xl border border-l-4 bg-[#0a1420] px-3 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--secondary)] ${TYPE_ACCENT_CLASS[item.type]} ${
        isDragging ? 'opacity-40' : ''
      } ${item.isHidden ? 'opacity-50' : ''} ${isSelected ? 'border-[#1b2c40] ring-2 ring-[var(--primary)]' : 'border-[#1b2c40]'}`}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={() => onSelect(item.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(item.id);
        }
      }}
    >
      <button
        type="button"
        className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-white active:cursor-grabbing"
        aria-label="Arrastrar para reordenar"
        title="Arrastrar para reordenar"
        onClick={(event) => event.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <CurrentPositionIndicator startSec={startSec} />

      {item.type === 'SONG' ? <SongSetlistCard item={item} teamSummary={teamSummary} /> : <BlockSetlistCard item={item} />}

      {item.type === 'SONG' && (
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--secondary)]"
          aria-label={isExpanded ? 'Cerrar workspace de la canción' : 'Abrir workspace de la canción'}
          aria-expanded={isExpanded}
          aria-controls={workspaceId}
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpand(item.id);
          }}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}

export const SetlistCard = memo(SetlistCardImpl);
