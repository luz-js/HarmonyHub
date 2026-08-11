import { useEffect, useMemo, useState } from 'react';
import { Copy, X } from 'lucide-react';
import type { SetlistItem, UpdateSetlistItemInput } from '../../../../shared/types';
import { formatBpm, formatDuration, formatKey } from '../../../../shared/utils/format';
import { useSongVersions } from '../../../songs/hooks/useSongVersions';
import { ItemAssignmentsSection } from '../../assignments/components/ItemAssignmentsSection';
import { ItemCuesSection } from '../../cues/components/ItemCuesSection';
import { useDeleteSetlistItem, useDuplicateSetlistItem, useUpdateSetlistItem } from '../../hooks';
import { canManageSetlistsClientSide, getCurrentUser } from '../../utils';
import type { InspectorMode } from '../hooks/useSetlistInspector';

export function SetlistInspector({
  item,
  organizationId,
  setlistId,
  mode,
  isOpen,
  onClose,
}: {
  item: SetlistItem | null;
  organizationId: string;
  setlistId: string;
  mode: InspectorMode;
  isOpen: boolean;
  onClose: () => void;
}) {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const canManageTeam = canManageSetlistsClientSide(currentUser.role);
  const updateMutation = useUpdateSetlistItem(organizationId, setlistId);
  const deleteMutation = useDeleteSetlistItem(organizationId, setlistId);
  const duplicateMutation = useDuplicateSetlistItem(organizationId, setlistId);
  const [duplicateIncludeCues, setDuplicateIncludeCues] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedSec, setEstimatedSec] = useState('');
  const [keyOverride, setKeyOverride] = useState('');
  const [bpmOverride, setBpmOverride] = useState('');
  const [durationOverrideSec, setDurationOverrideSec] = useState('');
  const [capo, setCapo] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [transitionNote, setTransitionNote] = useState('');

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setDescription(item.description || '');
    setEstimatedSec(item.estimatedSec != null ? String(item.estimatedSec) : '');
    setKeyOverride(item.keyOverride || '');
    setBpmOverride(item.bpmOverride != null ? String(item.bpmOverride) : '');
    setDurationOverrideSec(item.durationOverrideSec != null ? String(item.durationOverrideSec) : '');
    setCapo(item.capo != null ? String(item.capo) : '');
    setInternalNote(item.internalNote || '');
    setTransitionNote(item.transitionNote || '');
  }, [item]);

  const versionsQuery = useSongVersions(organizationId, item?.type === 'SONG' ? item.songId || '' : '');
  const versions = versionsQuery.data || [];

  if (!item) {
    if (mode !== 'side') return null;
    return (
      <aside className="hidden w-[360px] shrink-0 rounded-xl border border-[#1b2c40] bg-[#0a1420] p-4 lg:block">
        <p className="text-sm text-muted">Selecciona un item para editarlo.</p>
      </aside>
    );
  }

  if (mode !== 'side' && !isOpen) return null;

  function saveField(patch: UpdateSetlistItemInput) {
    if (!item) return;
    updateMutation.mutate({ itemId: item.id, input: patch });
  }

  function handleDelete() {
    if (!item) return;
    if (!window.confirm(`Eliminar "${item.title}"?`)) return;
    deleteMutation.mutate(item.id);
    onClose();
  }

  function handleDuplicate() {
    if (!item) return;
    duplicateMutation.mutate({ itemId: item.id, includeCues: duplicateIncludeCues });
  }

  const containerClass =
    mode === 'side'
      ? 'w-[360px] shrink-0 rounded-xl border border-[#1b2c40] bg-[#0a1420] p-4'
      : mode === 'drawer'
        ? 'fixed inset-y-0 right-0 z-40 w-[360px] max-w-full overflow-y-auto border-l border-[#1b2c40] bg-[#0a1420] p-4 shadow-[0_0_60px_rgba(0,0,0,0.5)]'
        : 'fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-[#1b2c40] bg-[#0a1420] p-4 shadow-[0_-20px_60px_rgba(0,0,0,0.5)]';

  return (
    <>
      {mode !== 'side' && <button type="button" aria-label="Cerrar inspector" className="fixed inset-0 z-30 bg-black/60" onClick={onClose} />}
      <aside className={containerClass} onKeyDown={(event) => event.key === 'Escape' && onClose()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Editar item</h3>
          {mode !== 'side' && (
            <button type="button" className="btn-ghost h-8 w-8 p-0" onClick={onClose} aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 space-y-5">
          <section>
            <p className="section-title">General</p>
            <label className="mt-2 block">
              <span className="label">Titulo</span>
              <input
                className="input"
                value={title}
                disabled={item.type === 'SONG'}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => item.type !== 'SONG' && saveField({ title })}
              />
            </label>
            <label className="mt-2 block">
              <span className="label">Descripcion</span>
              <input className="input" value={description} onChange={(event) => setDescription(event.target.value)} onBlur={() => saveField({ description: description || null })} />
            </label>
            {item.type !== 'SONG' && (
              <label className="mt-2 block">
                <span className="label">Duracion estimada (segundos)</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={estimatedSec}
                  onChange={(event) => setEstimatedSec(event.target.value)}
                  onBlur={() => saveField({ estimatedSec: estimatedSec ? Number(estimatedSec) : null })}
                />
              </label>
            )}
            <div className="mt-3 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={item.isOptional} onChange={(event) => saveField({ isOptional: event.target.checked })} /> Opcional
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={item.isHidden} onChange={(event) => saveField({ isHidden: event.target.checked })} /> Oculto
              </label>
            </div>
          </section>

          {item.type === 'SONG' && (
            <section>
              <p className="section-title">Overrides</p>

              {versions.length > 0 && (
                <label className="mt-2 block">
                  <span className="label">Version</span>
                  <select className="select" value={item.songVersionId || ''} onChange={(event) => saveField({ songVersionId: event.target.value })}>
                    {versions.map((version) => (
                      <option key={version.id} value={version.id}>
                        {version.name}
                        {version.isDefault ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="mt-2 text-xs text-muted">
                Efectivo: {formatKey(item.effective.key)} · {formatBpm(item.effective.bpm)} · {formatDuration(item.effective.durationSec)}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <label>
                  <span className="label">Key override</span>
                  <input
                    className="input"
                    value={keyOverride}
                    placeholder={item.songVersion?.key || ''}
                    onChange={(event) => setKeyOverride(event.target.value)}
                    onBlur={() => saveField({ keyOverride: keyOverride || null })}
                  />
                </label>
                <label>
                  <span className="label">BPM override</span>
                  <input
                    className="input"
                    type="number"
                    min={20}
                    max={300}
                    value={bpmOverride}
                    placeholder={String(item.songVersion?.bpm || '')}
                    onChange={(event) => setBpmOverride(event.target.value)}
                    onBlur={() => saveField({ bpmOverride: bpmOverride ? Number(bpmOverride) : null })}
                  />
                </label>
                <label>
                  <span className="label">Duracion (s)</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={durationOverrideSec}
                    placeholder={String(item.songVersion?.durationSec || '')}
                    onChange={(event) => setDurationOverrideSec(event.target.value)}
                    onBlur={() => saveField({ durationOverrideSec: durationOverrideSec ? Number(durationOverrideSec) : null })}
                  />
                </label>
                <label>
                  <span className="label">Capo</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={12}
                    value={capo}
                    onChange={(event) => setCapo(event.target.value)}
                    onBlur={() => saveField({ capo: capo ? Number(capo) : null })}
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" checked={item.includeClick} onChange={(event) => saveField({ includeClick: event.target.checked })} /> Click
                </label>
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" checked={item.includePad} onChange={(event) => saveField({ includePad: event.target.checked })} /> Pad
                </label>
              </div>
            </section>
          )}

          <section>
            <p className="section-title">Notas</p>
            <label className="mt-2 block">
              <span className="label">Nota de transicion</span>
              <input className="input" value={transitionNote} onChange={(event) => setTransitionNote(event.target.value)} onBlur={() => saveField({ transitionNote: transitionNote || null })} />
            </label>
            <label className="mt-2 block">
              <span className="label">Nota interna</span>
              <textarea
                className="textarea min-h-[70px]"
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
                onBlur={() => saveField({ internalNote: internalNote || null })}
              />
            </label>
          </section>

          <section>
            <p className="section-title">Equipo</p>
            <div className="mt-2">
              <ItemAssignmentsSection
                organizationId={organizationId}
                setlistId={setlistId}
                item={item}
                canManage={canManageTeam}
                currentUserId={currentUser.id}
              />
            </div>
          </section>

          <section>
            <p className="section-title">Cues y produccion</p>
            <div className="mt-2">
              <ItemCuesSection organizationId={organizationId} setlistId={setlistId} item={item} canManage={canManageTeam} currentUserId={currentUser.id} />
            </div>
          </section>

          {canManageTeam && (
            <div className="space-y-2 border-t border-[#1b2c40] pt-3">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={duplicateIncludeCues} onChange={(event) => setDuplicateIncludeCues(event.target.checked)} />
                Incluir cues al duplicar
              </label>
              <button type="button" className="btn-ghost w-full" disabled={duplicateMutation.isPending} onClick={handleDuplicate}>
                <Copy className="h-4 w-4" /> Duplicar item
              </button>
            </div>
          )}

          <button type="button" className="btn-ghost w-full text-red-300" onClick={handleDelete}>
            Eliminar item
          </button>
        </div>
      </aside>
    </>
  );
}
