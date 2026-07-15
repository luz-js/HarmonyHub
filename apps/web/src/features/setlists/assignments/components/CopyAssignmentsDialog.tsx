import { useState } from 'react';
import type { CopyAssignmentsMode, SetlistItem } from '../../../../shared/types';
import { OverlayDialog } from '../../../../shared/components/OverlayDialog';
import { useCopySetlistAssignments } from '../hooks/useSetlistAssignmentMutations';

const COPY_MODE_OPTIONS: Array<{ value: CopyAssignmentsMode; label: string }> = [
  { value: 'ALL', label: 'Todo el equipo' },
  { value: 'MUSICIANS_ONLY', label: 'Solo musicos (instrumentos y direccion)' },
  { value: 'VOCALS_ONLY', label: 'Solo voces' },
  { value: 'TECH_ONLY', label: 'Solo tecnica (pistas, click, audio)' },
];

export function CopyAssignmentsDialog({
  organizationId,
  setlistId,
  targetItem,
  otherItems,
  onClose,
}: {
  organizationId: string;
  setlistId: string;
  targetItem: SetlistItem;
  otherItems: SetlistItem[];
  onClose: () => void;
}) {
  const [sourceItemId, setSourceItemId] = useState('');
  const [mode, setMode] = useState<CopyAssignmentsMode>('ALL');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const copyMutation = useCopySetlistAssignments(organizationId, setlistId, targetItem.id);

  function handleCopy() {
    if (!sourceItemId) return;
    copyMutation.mutate({ sourceItemId, mode, replaceExisting }, { onSuccess: onClose });
  }

  return (
    <OverlayDialog title="Copiar equipo de otra cancion" subtitle={`Destino: ${targetItem.title}`} onClose={onClose}>
      <label className="block">
        <span className="label">Copiar desde</span>
        <select className="select" value={sourceItemId} onChange={(event) => setSourceItemId(event.target.value)}>
          <option value="" disabled>
            Selecciona un item
          </option>
          {otherItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block">
        <span className="label">Que copiar</span>
        <select className="select" value={mode} onChange={(event) => setMode(event.target.value as CopyAssignmentsMode)}>
          {COPY_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={replaceExisting} onChange={(event) => setReplaceExisting(event.target.checked)} />
        Reemplazar asignaciones existentes en {targetItem.title}
      </label>

      <p className="mt-2 text-xs text-muted">El estado de preparacion siempre se copia como "Pendiente", nunca como "Listo".</p>

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn-primary" disabled={!sourceItemId || copyMutation.isPending} onClick={handleCopy}>
          Copiar equipo
        </button>
      </div>
    </OverlayDialog>
  );
}
