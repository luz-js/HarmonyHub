import type { SetlistDetail } from '../../shared/types';
import { formatSetlistDuration } from '../setlists/utils';
import { SongSheet } from './SongSheet';
import { printableItems, type SetlistPrintData } from './setlistPrintData';

/** PDF del setlist: portada (nombre, fecha y orden) y despues cada cancion en su propia pagina. */
export function SetlistSheet({ setlist, data, printedAt = new Date() }: { setlist: SetlistDetail; data: SetlistPrintData; printedAt?: Date }) {
  const items = printableItems(setlist);
  return (
    <>
      <article className="print-cover">
        <h1>{setlist.name}</h1>
        {setlist.description && <p className="print-artist">{setlist.description}</p>}
        <p className="print-details">
          {printedAt.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {setlist.estimatedSec > 0 && ` · Duración estimada ${formatSetlistDuration(setlist.estimatedSec)}`}
        </p>
        <ol className="print-order">
          {items.map((item) => (
            <li key={item.id}>
              <span>{item.title}</span>
              <span className="print-order-meta">{[item.type === 'SONG' ? item.effective.key : null, item.song?.artist].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </ol>
      </article>
      {data.songs.map(({ itemId, sheet }) => (
        <SongSheet key={itemId} song={sheet} breakBefore />
      ))}
    </>
  );
}
