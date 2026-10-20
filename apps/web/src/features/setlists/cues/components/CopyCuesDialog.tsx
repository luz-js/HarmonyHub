import { useState } from 'react';
import type { CueCategory, SetlistCuePhase, SetlistItem } from '../../../../shared/types';
import { OverlayDialog } from '../../../../shared/components/OverlayDialog';
import { useCopySetlistCues } from '../hooks/useSetlistCueMutations';
import { CUE_CATEGORIES, CUE_CATEGORY_LABELS } from '../utils/cueCategory';
import { PHASE_LABELS } from '../utils/cueLabels';

const PHASE_OPTIONS: SetlistCuePhase[] = ['BEFORE', 'DURING', 'AFTER'];

export function CopyCuesDialog({
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
  const [phases, setPhases] = useState<SetlistCuePhase[]>([]);
  const [categories, setCategories] = useState<CueCategory[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [includeResponsibles, setIncludeResponsibles] = useState(false);
  const copyMutation = useCopySetlistCues(organizationId, setlistId, targetItem.id);

  function togglePhase(phase: SetlistCuePhase) {
    setPhases((current) => (current.includes(phase) ? current.filter((p) => p !== phase) : [...current, phase]));
  }

  function toggleCategory(category: CueCategory) {
    setCategories((current) => (current.includes(category) ? current.filter((c) => c !== category) : [...current, category]));
  }

  function handleCopy() {
    if (!sourceItemId) return;
    copyMutation.mutate(
      {
        sourceItemId,
        phases: phases.length > 0 ? phases : undefined,
        categories: categories.length > 0 ? categories : undefined,
        replaceExisting,
        includeResponsibles,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <OverlayDialog title="Copiar cues de otra canción" subtitle={`Destino: ${targetItem.title}`} onClose={onClose}>
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

      <div className="mt-3">
        <span className="label">Fases (vacío = todas)</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {PHASE_OPTIONS.map((phase) => (
            <button
              key={phase}
              type="button"
              className={phases.includes(phase) ? 'btn-primary h-7 px-2 text-xs' : 'btn-ghost h-7 px-2 text-xs'}
              onClick={() => togglePhase(phase)}
            >
              {PHASE_LABELS[phase]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <span className="label">Categorías (vacío = todas)</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {CUE_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={categories.includes(category) ? 'btn-primary h-7 px-2 text-xs' : 'btn-ghost h-7 px-2 text-xs'}
              onClick={() => toggleCategory(category)}
            >
              {CUE_CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={includeResponsibles} onChange={(event) => setIncludeResponsibles(event.target.checked)} />
        Incluir responsables (cuando aplique)
      </label>

      <label className="mt-2 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={replaceExisting} onChange={(event) => setReplaceExisting(event.target.checked)} />
        Reemplazar cues existentes en {targetItem.title}
      </label>

      <p className="mt-2 text-xs text-muted">Los cues copiados siempre empiezan en estado "Pendiente".</p>

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn-primary" disabled={!sourceItemId || copyMutation.isPending} onClick={handleCopy}>
          Copiar cues
        </button>
      </div>
    </OverlayDialog>
  );
}
