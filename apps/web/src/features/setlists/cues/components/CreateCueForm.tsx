import { useState } from 'react';
import type { SetlistCuePhase, SetlistCueType } from '../../../../shared/types';
import { useCreateSetlistCue } from '../hooks/useSetlistCueMutations';
import { getCueTypeLabel } from '../utils/cueLabels';
import { CueTypePicker } from './CueTypePicker';

export function CreateCueForm({
  organizationId,
  setlistId,
  setlistItemId,
  phase,
  onDone,
}: {
  organizationId: string;
  setlistId: string;
  setlistItemId: string | null;
  phase: SetlistCuePhase;
  onDone: () => void;
}) {
  const [type, setType] = useState<SetlistCueType | ''>('');
  const [title, setTitle] = useState('');
  const [offsetSec, setOffsetSec] = useState('');
  const createMutation = useCreateSetlistCue(organizationId, setlistId);

  function handleTypeChange(nextType: SetlistCueType) {
    setType(nextType);
    if (!title.trim()) setTitle(getCueTypeLabel(nextType));
  }

  function handleCreate() {
    if (!type || !title.trim()) return;
    createMutation.mutate(
      {
        setlistItemId,
        type,
        phase,
        title: title.trim(),
        offsetSec: offsetSec === '' ? null : Number(offsetSec),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-[#1b2c40] p-2">
      <CueTypePicker value={type} onChange={handleTypeChange} />
      <input className="input" placeholder="Titulo del cue" value={title} onChange={(event) => setTitle(event.target.value)} />
      <label className="block">
        <span className="label">Offset (segundos)</span>
        <input className="input" type="number" value={offsetSec} onChange={(event) => setOffsetSec(event.target.value)} />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={onDone}>
          Cancelar
        </button>
        <button type="button" className="btn-primary h-8 px-3 text-xs" disabled={!type || !title.trim() || createMutation.isPending} onClick={handleCreate}>
          Guardar
        </button>
      </div>
    </div>
  );
}
