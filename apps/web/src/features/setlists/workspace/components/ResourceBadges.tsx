import { FileText, Music2 } from 'lucide-react';
import { useSongFiles } from '../../../songs/hooks/useSongFiles';
import { useSongTracks } from '../../../songs/hooks/useSongTracks';

/**
 * Conteos de pistas/archivos, solo para canciones que ya fueron expandidas al menos una vez
 * en esta sesion (ver `everExpandedItemIds` en SetlistCanvas). No hay conteos de links/notas/
 * threads/actividad en el backend, y no se piden recursos de canciones nunca expandidas.
 */
export function ResourceBadges({ organizationId, songId }: { organizationId: string; songId: string }) {
  const tracksQuery = useSongTracks(organizationId, songId);
  const filesQuery = useSongFiles(organizationId, songId);

  const tracksCount = tracksQuery.data?.length;
  const filesCount = filesQuery.data?.length;

  if (tracksCount == null && filesCount == null) return null;

  return (
    <div className="flex shrink-0 items-center gap-2 text-[11px] text-faint">
      {tracksCount != null && tracksCount > 0 && (
        <span className="flex items-center gap-1" title="Pistas">
          <Music2 className="h-3 w-3" /> {tracksCount}
        </span>
      )}
      {filesCount != null && filesCount > 0 && (
        <span className="flex items-center gap-1" title="Archivos">
          <FileText className="h-3 w-3" /> {filesCount}
        </span>
      )}
    </div>
  );
}
