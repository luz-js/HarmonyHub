import { useMemo, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import type { SongVersion } from '../../../../shared/types';
import { OverlayDialog } from '../../../../shared/components/OverlayDialog';
import { SongCollaborationPanel } from '../../../songs/components/collaboration/SongCollaborationPanel';
import { useSongThreads } from '../../../songs/hooks/useSongThreads';

/** Resumen liviano de colaboracion — la conversacion completa se abre bajo demanda en un dialogo. */
export function CollaborationSummaryPanel({ organizationId, songId, version }: { organizationId: string; songId: string; version: SongVersion }) {
  const threadsQuery = useSongThreads(organizationId, songId, { versionId: version.id });
  const [showFull, setShowFull] = useState(false);
  const threads = useMemo(() => threadsQuery.data || [], [threadsQuery.data]);
  const openCount = threads.filter((thread) => thread.status === 'OPEN').length;
  const mostRecent = threads[0];

  return (
    <div className="space-y-4 p-4">
      {threadsQuery.isLoading && <p className="text-sm text-muted">Cargando conversaciones...</p>}
      {threadsQuery.error && <p className="text-sm text-red-200">No se pudieron cargar las conversaciones.</p>}
      {!threadsQuery.isLoading && !threadsQuery.error && threads.length === 0 && <p className="text-sm text-muted">Todavía no hay conversaciones sobre esta canción.</p>}

      {threads.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <MessageSquare className="h-4 w-4" />
          <span>{openCount} hilo(s) abierto(s) · {threads.length} en total</span>
        </div>
      )}
      {mostRecent?.lastComment && !mostRecent.lastComment.isDeleted && (
        <div className="rounded-xl border border-[#1b2c40] bg-[#091522] p-3">
          <p className="text-xs font-semibold text-white">{mostRecent.lastComment.author?.name || 'Alguien'}</p>
          <p className="mt-1 truncate text-sm text-muted">{mostRecent.lastComment.content}</p>
        </div>
      )}

      <button type="button" className="btn-ghost" onClick={() => setShowFull(true)}>
        Abrir conversación
      </button>

      {showFull && (
        <OverlayDialog title="Conversaciones" onClose={() => setShowFull(false)}>
          <SongCollaborationPanel songId={songId} versions={[version]} activeVersionId={version.id} />
        </OverlayDialog>
      )}
    </div>
  );
}
