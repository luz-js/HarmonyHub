import { useMemo, useState } from 'react';
import type { SetlistItem } from '../../../../shared/types';
import { OverlayDialog } from '../../../../shared/components/OverlayDialog';
import { canManageSetlistsClientSide, getCurrentUser } from '../../utils';
import { useSetlistTeam } from '../hooks/useSetlistTeam';
import { MissingRolesAlert } from './MissingRolesAlert';
import { MyPreparationPanel } from './MyPreparationPanel';
import { ParticipantList } from './ParticipantList';
import { ParticipantWorkloadView } from './ParticipantWorkloadView';

type TeamPanelTab = 'team' | 'byItem' | 'byMusician' | 'myPreparation';

const TABS: Array<{ id: TeamPanelTab; label: string }> = [
  { id: 'team', label: 'Equipo' },
  { id: 'byItem', label: 'Por canción' },
  { id: 'byMusician', label: 'Por músico' },
  { id: 'myPreparation', label: 'Mi preparación' },
];

export function SetlistTeamPanel({
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
  const currentUser = useMemo(() => getCurrentUser(), []);
  const canManage = canManageSetlistsClientSide(currentUser.role);
  const teamQuery = useSetlistTeam(organizationId, setlistId);
  const [tab, setTab] = useState<TeamPanelTab>('team');

  const team = teamQuery.data;
  const itemTitleById = new Map(items.map((item) => [item.id, item.title]));
  const allAssignments = useMemo(() => (team?.items ?? []).flatMap((entry) => entry.assignments), [team]);

  return (
    <OverlayDialog title="Equipo del setlist" subtitle={team ? `${team.participants.length} participante(s)` : undefined} onClose={onClose}>
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
        {teamQuery.isLoading && <p className="text-sm text-muted">Cargando equipo...</p>}

        {team && tab === 'team' && (
          <ParticipantList organizationId={organizationId} setlistId={setlistId} participants={team.participants} canManage={canManage} />
        )}

        {team && tab === 'byItem' && (
          <div className="space-y-3">
            {team.items
              .filter((entry) => entry.assignments.length > 0 || entry.requirements.length > 0)
              .map((entry) => (
                <div key={entry.itemId} className="rounded-lg border border-[#30333A] p-2">
                  <p className="text-sm font-semibold text-white">{itemTitleById.get(entry.itemId) || 'Item'}</p>
                  <p className="mt-0.5 text-xs text-muted">{entry.assignments.length} musico(s) asignado(s)</p>
                  <div className="mt-2">
                    <MissingRolesAlert coverage={entry.coverage} />
                  </div>
                </div>
              ))}
            {team.items.every((entry) => entry.assignments.length === 0 && entry.requirements.length === 0) && (
              <p className="text-xs text-muted">Todavía no hay asignaciones ni requisitos en este setlist.</p>
            )}
          </div>
        )}

        {team && tab === 'byMusician' && (
          <ParticipantWorkloadView participants={team.participants} assignments={allAssignments} totalItems={items.length} />
        )}

        {team && tab === 'myPreparation' && (
          <MyPreparationPanel
            organizationId={organizationId}
            setlistId={setlistId}
            items={items}
            assignments={allAssignments}
            currentUserId={currentUser.id}
          />
        )}
      </div>
    </OverlayDialog>
  );
}
