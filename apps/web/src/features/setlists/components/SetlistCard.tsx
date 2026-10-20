import { LayoutTemplate, ListMusic } from 'lucide-react';
import type { SetlistSummary } from '../../../shared/types';
import { formatDate, plural } from '../../../shared/utils/format';
import { formatSetlistDuration } from '../utils';
import { SetlistStatusBadge } from './SetlistStatusBadge';

export function SetlistCard({ setlist, onOpen }: { setlist: SetlistSummary; onOpen: () => void }) {
  const details = [
    plural(setlist.songsCount, 'canción', 'canciones'),
    setlist.nonSongItemsCount > 0 ? plural(setlist.nonSongItemsCount, 'bloque') : '',
    setlist.estimatedSec > 0 ? formatSetlistDuration(setlist.estimatedSec) : '',
  ].filter(Boolean);
  return (
    <button type="button" className="panel flex w-full flex-col p-5 text-left transition hover:border-[#3D4048]" onClick={onOpen}>
      <span className="flex w-full items-start gap-3">
        <span className="icon-tile h-11 w-11 shrink-0 rounded-xl">{setlist.isTemplate ? <LayoutTemplate className="h-5 w-5" /> : <ListMusic className="h-5 w-5" />}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-bold text-white">{setlist.name}</span>
          <span className="mt-0.5 block text-sm text-muted">{details.join(' · ')}</span>
        </span>
        {setlist.isTemplate ? <span className="badge badge-purple">Plantilla</span> : <SetlistStatusBadge status={setlist.status} />}
      </span>
      {setlist.description && <span className="mt-3 line-clamp-2 text-sm text-[#D8D5CE]">{setlist.description}</span>}
      <span className="mt-4 flex w-full items-center justify-between gap-3 border-t border-[#23252A] pt-3 text-xs text-faint">
        <span className="truncate">{setlist.createdBy ? `Creado por ${setlist.createdBy.name}` : ''}</span>
        <span className="shrink-0">Actualizado {formatDate(setlist.updatedAt)}</span>
      </span>
    </button>
  );
}
