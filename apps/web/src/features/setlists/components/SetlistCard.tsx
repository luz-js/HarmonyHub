import { Music2, ListMusic } from 'lucide-react';
import type { SetlistSummary } from '../../../shared/types';
import { formatDate } from '../../../shared/utils/format';
import { formatSetlistDuration } from '../utils';
import { SetlistStatusBadge } from './SetlistStatusBadge';

export function SetlistCard({ setlist, onOpen }: { setlist: SetlistSummary; onOpen: () => void }) {
  return (
    <article className="panel cursor-pointer p-5 transition hover:border-primary/30" onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">{setlist.name}</h3>
          {setlist.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{setlist.description}</p>}
        </div>
        <SetlistStatusBadge status={setlist.status} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><Music2 className="h-3.5 w-3.5" /> {setlist.songsCount} canciones</span>
        {setlist.nonSongItemsCount > 0 && (
          <span className="flex items-center gap-1.5"><ListMusic className="h-3.5 w-3.5" /> {setlist.nonSongItemsCount} bloques</span>
        )}
        <span>{formatSetlistDuration(setlist.estimatedSec)}</span>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-faint">
        <span>{setlist.createdBy ? `Creado por ${setlist.createdBy.name}` : ''}</span>
        <span>Actualizado {formatDate(setlist.updatedAt)}</span>
      </div>
    </article>
  );
}
