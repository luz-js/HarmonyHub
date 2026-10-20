import { useState } from 'react';
import type { CueWarning, SetlistItem } from '../../../../shared/types';
import { OverlayDialog } from '../../../../shared/components/OverlayDialog';
import { canManageSetlistsClientSide, getCurrentUser } from '../../utils';
import { useSetlistProduction } from '../hooks/useSetlistProduction';
import { CUE_CATEGORY_LABELS } from '../utils/cueCategory';
import { PHASE_LABELS } from '../utils/cueLabels';
import { CuePhaseSection } from './CuePhaseSection';
import { CueWarningsAlert } from './CueWarningsAlert';
import { MyCuesPanel } from './MyCuesPanel';

type ProductionTab = 'general' | 'department' | 'responsible' | 'mine';

const TABS: Array<{ id: ProductionTab; label: string }> = [
  { id: 'general', label: 'Producción' },
  { id: 'department', label: 'Por departamento' },
  { id: 'responsible', label: 'Por responsable' },
  { id: 'mine', label: 'Mis cues' },
];

export function SetlistProductionPanel({
  organizationId,
  setlistId,
  items,
  onClose,
}: {
  organizationId: string;
  setlistId: string;
  items: SetlistItem[];
  onClose: () => void;
}) {
  const currentUser = getCurrentUser();
  const canManage = canManageSetlistsClientSide(currentUser.role);
  const productionQuery = useSetlistProduction(organizationId, setlistId);
  const [tab, setTab] = useState<ProductionTab>('general');

  const production = productionQuery.data;
  const globalCues = production?.cues.filter((cue) => cue.phase === 'GLOBAL') ?? [];
  const warningsByCueId = new Map<string, CueWarning[]>();
  for (const warning of production?.warnings ?? []) {
    const list = warningsByCueId.get(warning.cueId) ?? [];
    list.push(warning);
    warningsByCueId.set(warning.cueId, list);
  }

  return (
    <OverlayDialog title="Producción del setlist" subtitle={production ? `${production.coverage.total} cue(s)` : undefined} onClose={onClose}>
      <div className="flex flex-wrap gap-1 border-b border-[#30333A] pb-2">
        {TABS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={tab === option.id ? 'btn-primary h-8 px-3 text-xs' : 'btn-ghost h-8 px-3 text-xs'}
            onClick={() => setTab(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-3 max-h-[60vh] overflow-y-auto">
        {productionQuery.isLoading && <p className="text-sm text-muted">Cargando producción...</p>}

        {production && tab === 'general' && (
          <div className="space-y-3">
            <CueWarningsAlert warnings={production.warnings} />
            <p className="section-title">{PHASE_LABELS.GLOBAL}</p>
            <CuePhaseSection
              organizationId={organizationId}
              setlistId={setlistId}
              setlistItemId={null}
              phase="GLOBAL"
              cues={globalCues}
              warningsByCueId={warningsByCueId}
              canManage={canManage}
              currentUserId={currentUser.id}
            />
          </div>
        )}

        {production && tab === 'department' && (
          <div className="space-y-2">
            {production.byCategory.map((entry) => (
              <div key={entry.category} className="flex items-center justify-between rounded-lg border border-[#30333A] px-3 py-2 text-sm text-white">
                <span>{CUE_CATEGORY_LABELS[entry.category]}</span>
                <span className="text-xs text-muted">
                  {entry.total} total · {entry.pending} pendientes{entry.critical > 0 ? ` · ${entry.critical} críticos` : ''}
                </span>
              </div>
            ))}
            {production.byCategory.length === 0 && <p className="text-xs text-muted">Todavía no hay cues en este setlist.</p>}
          </div>
        )}

        {production && tab === 'responsible' && (
          <div className="space-y-2">
            {production.byResponsible.map((entry) => (
              <div key={entry.participantId ?? 'unassigned'} className="flex items-center justify-between rounded-lg border border-[#30333A] px-3 py-2 text-sm text-white">
                <span>{entry.participantName}</span>
                <span className="text-xs text-muted">
                  {entry.total} total · {entry.ready} listos · {entry.pending} pendientes{entry.critical > 0 ? ` · ${entry.critical} críticos` : ''}
                </span>
              </div>
            ))}
            {production.byResponsible.length === 0 && <p className="text-xs text-muted">Todavía no hay cues en este setlist.</p>}
          </div>
        )}

        {production && tab === 'mine' && (
          <MyCuesPanel organizationId={organizationId} setlistId={setlistId} items={items} cues={production.cues} currentUserId={currentUser.id} />
        )}
      </div>
    </OverlayDialog>
  );
}
