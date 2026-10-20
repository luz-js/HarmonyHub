import { useState } from 'react';
import type { SongVersion } from '../../../../shared/types';
import { OverlayDialog } from '../../../../shared/components/OverlayDialog';
import { ActivityItem } from '../../../songs/components/history/ActivityItem';
import { SongHistoryPanel } from '../../../songs/components/history/SongHistoryPanel';
import { useSongActivity } from '../../../songs/hooks/useSongActivity';

/** Resumen liviano de actividad — el historial completo se abre bajo demanda en un dialogo. */
export function HistorySummaryPanel({
  organizationId,
  songId,
  songTitle,
  version,
}: {
  organizationId: string;
  songId: string;
  songTitle: string;
  version: SongVersion;
}) {
  const activityQuery = useSongActivity(organizationId, songId, { versionId: version.id, pageSize: 3 });
  const [showFull, setShowFull] = useState(false);
  const items = activityQuery.data?.items || [];

  return (
    <div className="space-y-4 p-4">
      {activityQuery.isLoading && <p className="text-sm text-muted">Cargando historial...</p>}
      {activityQuery.error && <p className="text-sm text-[#F7A39A]">No se pudo cargar el historial.</p>}
      {!activityQuery.isLoading && !activityQuery.error && items.length === 0 && <p className="text-sm text-muted">Todavía no hay actividad registrada.</p>}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      )}
      <button type="button" className="btn-ghost" onClick={() => setShowFull(true)}>
        Ver historial completo
      </button>

      {showFull && (
        <OverlayDialog title="Historial completo" subtitle={songTitle} onClose={() => setShowFull(false)}>
          <SongHistoryPanel songId={songId} versions={[version]} activeVersionId={version.id} canManage={false} />
        </OverlayDialog>
      )}
    </div>
  );
}
