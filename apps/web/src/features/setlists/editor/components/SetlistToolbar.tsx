import { useState } from 'react';
import { Eye, ListOrdered, LoaderCircle, Plus, Send, Users } from 'lucide-react';
import type { SetlistItem, SetlistStatus } from '../../../../shared/types';
import { SetlistTeamPanel } from '../../assignments/components/SetlistTeamPanel';
import { useSetlistTeam } from '../../assignments/hooks/useSetlistTeam';
import { SetlistProductionPanel } from '../../cues/components/SetlistProductionPanel';
import { useSetlistProduction } from '../../cues/hooks/useSetlistProduction';
import { SetlistPreviewDialog } from './SetlistPreviewDialog';

export function SetlistToolbar({
  organizationId,
  setlistId,
  name,
  status,
  items,
  canManage,
  canPublish,
  publishing,
  onPublish,
  onAdd,
}: {
  organizationId: string;
  setlistId: string;
  name: string;
  status: SetlistStatus;
  items: SetlistItem[];
  canManage: boolean;
  canPublish: boolean;
  publishing: boolean;
  onPublish: () => void;
  onAdd: () => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [productionOpen, setProductionOpen] = useState(false);
  const teamQuery = useSetlistTeam(organizationId, setlistId);
  const productionQuery = useSetlistProduction(organizationId, setlistId);

  const canPublishNow = canPublish && status !== 'PUBLISHED' && status !== 'ARCHIVED';

  const cueRiskCount =
    (productionQuery.data?.coverage.critical ?? 0) + (productionQuery.data?.coverage.blocked ?? 0) + (productionQuery.data?.coverage.needsReview ?? 0);

  function handlePublishClick() {
    const missingRolesCount = teamQuery.data?.missingRolesCount ?? 0;
    const warnings: string[] = [];
    if (missingRolesCount > 0) warnings.push(missingRolesCount === 1 ? '1 rol sin cubrir' : `${missingRolesCount} roles sin cubrir`);
    if (cueRiskCount > 0) warnings.push(cueRiskCount === 1 ? '1 cue crítico, bloqueado o por revisar' : `${cueRiskCount} cues críticos, bloqueados o por revisar`);

    if (warnings.length > 0) {
      const confirmed = window.confirm(`Este setlist tiene ${warnings.join(' y ')}. ¿Publicarlo de todas formas?`);
      if (!confirmed) return;
    }
    onPublish();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-y border-[#23252A] py-3">
        {canManage && (
          <button type="button" className="btn-ghost" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Agregar
          </button>
        )}

        <button type="button" className="btn-ghost" onClick={() => setTeamOpen(true)}>
          <Users className="h-4 w-4" /> Equipo
          {(teamQuery.data?.missingRolesCount ?? 0) > 0 && <span className="badge badge-warning">{teamQuery.data?.missingRolesCount}</span>}
        </button>

        <button type="button" className="btn-ghost" onClick={() => setProductionOpen(true)}>
          <ListOrdered className="h-4 w-4" /> Producción
          {cueRiskCount > 0 && <span className="badge badge-warning">{cueRiskCount}</span>}
        </button>

        <button type="button" className="btn-ghost" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-4 w-4" /> Vista previa
        </button>

        {canPublishNow && (
          <button type="button" className="btn-primary sm:ml-auto" onClick={handlePublishClick} disabled={publishing}>
            {publishing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publicar
          </button>
        )}

      {previewOpen && <SetlistPreviewDialog name={name} items={items} onClose={() => setPreviewOpen(false)} />}
      {teamOpen && <SetlistTeamPanel organizationId={organizationId} setlistId={setlistId} items={items} onClose={() => setTeamOpen(false)} />}
      {productionOpen && (
        <SetlistProductionPanel organizationId={organizationId} setlistId={setlistId} items={items} onClose={() => setProductionOpen(false)} />
      )}
    </div>
  );
}
