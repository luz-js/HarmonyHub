import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, GitCompare, History as HistoryIcon, RotateCcw } from 'lucide-react';
import { useRestoreSongRevision, useSongActivity, useSongRevisionDiff, useSongRevisions } from '../../hooks';
import type { SongVersion } from '../../../../shared/types';
import { getCurrentOrganizationId } from '../../../../shared/api/http';
import { ActivityItem } from './ActivityItem';
import { RestoreRevisionDialog } from './RestoreRevisionDialog';
import { RevisionDiffView } from './RevisionDiffView';
import { formatHistoryDate, revisionSourceLabels } from './history.utils';

type HistoryTab = 'actividad' | 'revisiones';

export function SongHistoryPanel({
  songId,
  versions,
  activeVersionId,
  canManage,
  onChanged,
}: {
  songId: string;
  versions: SongVersion[];
  activeVersionId: string | null;
  canManage: boolean;
  onChanged?: () => void;
}) {
  const organizationId = getCurrentOrganizationId() || '';
  const [tab, setTab] = useState<HistoryTab>('actividad');
  const [page, setPage] = useState(1);
  const [selectedVersionId, setSelectedVersionId] = useState(activeVersionId || versions[0]?.id || '');
  const [compareRevisionNumber, setCompareRevisionNumber] = useState<number | null>(null);
  const [restoringRevisionNumber, setRestoringRevisionNumber] = useState<number | null>(null);
  const [restoreError, setRestoreError] = useState('');

  const activityQuery = useSongActivity(organizationId, songId, { page, pageSize: 20 });
  const revisionsQuery = useSongRevisions(organizationId, songId, selectedVersionId);
  const diffQuery = useSongRevisionDiff(organizationId, songId, selectedVersionId, compareRevisionNumber);
  const restoreMutation = useRestoreSongRevision(organizationId, songId, selectedVersionId);

  const revisions = useMemo(() => revisionsQuery.data || [], [revisionsQuery.data]);
  const latestRevisionNumber = revisions[0]?.revisionNumber ?? null;
  const effectiveCompareNumber = compareRevisionNumber ?? latestRevisionNumber;
  const restoringRevision = revisions.find((revision) => revision.revisionNumber === restoringRevisionNumber);

  async function handleRestore(reason: string) {
    if (!restoringRevisionNumber) return;
    setRestoreError('');
    try {
      await restoreMutation.mutateAsync({ revisionNumber: restoringRevisionNumber, reason: reason || undefined });
      setRestoringRevisionNumber(null);
      onChanged?.();
    } catch (error: any) {
      setRestoreError(error?.message || 'No se pudo restaurar la revisión');
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#1b2c40] bg-[#07131d] p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00D4C8]">Historial</p>
          <h2 className="mt-2 text-xl font-bold text-white">Actividad y revisiones</h2>
          <p className="mt-1 text-sm text-muted">Consulta qué cambió, quién lo hizo y recupera un estado anterior de una versión.</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={tab === 'actividad' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('actividad')}><HistoryIcon className="h-4 w-4" /> Actividad</button>
          <button className={tab === 'revisiones' ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab('revisiones')}><GitCompare className="h-4 w-4" /> Revisiones</button>
        </div>
      </section>

      {tab === 'actividad' && (
        <section className="panel p-5">
          {activityQuery.isLoading && <p className="text-muted">Cargando actividad...</p>}
          {activityQuery.error && <p className="text-sm text-red-200">No se pudo cargar la actividad.</p>}
          {activityQuery.data && activityQuery.data.items.length === 0 && <p className="text-sm text-muted">Todavía no hay actividad registrada.</p>}
          {activityQuery.data && activityQuery.data.items.length > 0 && (
            <div className="space-y-3">
              {activityQuery.data.items.map((activity) => <ActivityItem key={activity.id} activity={activity} />)}
            </div>
          )}
          {activityQuery.data && activityQuery.data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" /> Anterior</button>
              <span className="text-xs text-muted">Página {activityQuery.data.page} de {activityQuery.data.totalPages}</span>
              <button className="btn-ghost" disabled={page >= activityQuery.data.totalPages} onClick={() => setPage((current) => current + 1)}>Siguiente <ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </section>
      )}

      {tab === 'revisiones' && (
        <div className="space-y-5">
          <section className="panel p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="label">Versión</span>
                <select className="select" value={selectedVersionId} onChange={(event) => { setSelectedVersionId(event.target.value); setCompareRevisionNumber(null); }}>
                  {versions.map((version) => <option key={version.id} value={version.id}>{version.name}</option>)}
                </select>
              </label>
              <label>
                <span className="label">Comparar con</span>
                <select className="select" value={compareRevisionNumber ?? ''} onChange={(event) => setCompareRevisionNumber(event.target.value ? Number(event.target.value) : null)}>
                  <option value="">Versión actual</option>
                  {revisions.map((revision) => <option key={revision.id} value={revision.revisionNumber}>Revisión {revision.revisionNumber}</option>)}
                </select>
              </label>
            </div>
          </section>

          {revisionsQuery.isLoading && <section className="panel p-5 text-muted">Cargando revisiones...</section>}
          {revisionsQuery.error && <section className="panel p-5 text-sm text-red-200">No se pudo cargar el historial de revisiones.</section>}

          {effectiveCompareNumber && diffQuery.data && (
            <section className="panel p-5">
              <h3 className="mb-3 text-base font-bold text-white">
                Comparando revisión {effectiveCompareNumber} con {compareRevisionNumber ? `revisión ${compareRevisionNumber}` : 'la versión actual'}
              </h3>
              <RevisionDiffView result={diffQuery.data} />
            </section>
          )}

          {revisions.length > 0 && (
            <section className="panel p-5">
              <h3 className="mb-4 text-base font-bold text-white">Revisiones</h3>
              <div className="space-y-3">
                {revisions.map((revision) => (
                  <article key={revision.id} className="rounded-2xl border border-[#1b2c40] bg-[#091522] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="badge badge-primary">Revisión {revision.revisionNumber}</span>
                          <span className="badge">{revisionSourceLabels[revision.source] || revision.source}</span>
                        </div>
                        <p className="mt-2 text-sm text-white/90">{revision.reason || 'Sin razón registrada'}</p>
                        <p className="mt-1 text-xs text-muted">
                          {revision.createdBy?.name || 'Desconocido'} · {formatHistoryDate(revision.createdAt)} · {revision.key || '—'} · {revision.bpm ?? '—'} BPM
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className="btn-ghost h-9 px-3" onClick={() => setCompareRevisionNumber(revision.revisionNumber)}>
                          <GitCompare className="h-4 w-4" /> Comparar
                        </button>
                        {canManage && (
                          <button type="button" className="btn-ghost h-9 px-3" onClick={() => { setRestoreError(''); setRestoringRevisionNumber(revision.revisionNumber); }}>
                            <RotateCcw className="h-4 w-4" /> Restaurar
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {restoringRevision && (
        <RestoreRevisionDialog
          revision={restoringRevision}
          submitting={restoreMutation.isPending}
          error={restoreError}
          onConfirm={(reason) => void handleRestore(reason)}
          onClose={() => setRestoringRevisionNumber(null)}
        />
      )}
    </div>
  );
}
