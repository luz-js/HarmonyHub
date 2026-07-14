import { FormEvent, useMemo, useState } from 'react';
import { LoaderCircle, Plus, Search } from 'lucide-react';
import { useSongVersions } from '../../songs/hooks/useSongVersions';
import { useSongs } from '../../songs/hooks/useSongs';
import { OverlayDialog } from '../../../shared/components/OverlayDialog';
import type { SetlistItemType } from '../../../shared/types';
import { formatBpm, formatDuration, formatKey } from '../../../shared/utils/format';
import { useCreateSetlistItem } from '../hooks';
import { SETLIST_ITEM_TYPE_OPTIONS } from '../utils';

export function AddSetlistItemDialog({
  organizationId,
  setlistId,
  insertIndex,
  onClose,
}: {
  organizationId: string;
  setlistId: string;
  insertIndex?: number;
  onClose: () => void;
}) {
  const [type, setType] = useState<SetlistItemType>('SONG');
  const [search, setSearch] = useState('');
  const [selectedSongId, setSelectedSongId] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [showOverrides, setShowOverrides] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedSec, setEstimatedSec] = useState('');
  const [keyOverride, setKeyOverride] = useState('');
  const [bpmOverride, setBpmOverride] = useState('');
  const [durationOverrideSec, setDurationOverrideSec] = useState('');
  const [capo, setCapo] = useState('');
  const [transitionNote, setTransitionNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [error, setError] = useState('');

  const songsQuery = useSongs(organizationId, search.trim() ? { search: search.trim() } : {});
  const versionsQuery = useSongVersions(organizationId, selectedSongId);
  const versions = versionsQuery.data || [];
  const selectedVersion = useMemo(() => versions.find((version) => version.id === selectedVersionId), [versions, selectedVersionId]);

  const createMutation = useCreateSetlistItem(organizationId, setlistId);

  function selectSong(songId: string, defaultVersionId?: string | null) {
    setSelectedSongId(songId);
    setSelectedVersionId(defaultVersionId || '');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (type === 'SONG' && (!selectedSongId || !selectedVersionId)) {
      setError('Selecciona una canción y una versión.');
      return;
    }
    if (type !== 'SONG' && !title.trim()) {
      setError('El título es requerido.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        type,
        songId: type === 'SONG' ? selectedSongId : undefined,
        songVersionId: type === 'SONG' ? selectedVersionId : undefined,
        title: type === 'SONG' ? undefined : title.trim(),
        description: description.trim() || undefined,
        estimatedSec: estimatedSec ? Number(estimatedSec) : undefined,
        keyOverride: keyOverride.trim() || undefined,
        bpmOverride: bpmOverride ? Number(bpmOverride) : undefined,
        durationOverrideSec: durationOverrideSec ? Number(durationOverrideSec) : undefined,
        capo: capo ? Number(capo) : undefined,
        transitionNote: transitionNote.trim() || undefined,
        internalNote: internalNote.trim() || undefined,
        insertIndex,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'No se pudo agregar el item');
    }
  }

  return (
    <OverlayDialog title="Agregar item" subtitle="Canciones desde tu catálogo o bloques como oración, avisos y transiciones." onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <div className="flex flex-wrap gap-2">
          {SETLIST_ITEM_TYPE_OPTIONS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={type === value ? 'btn-primary' : 'btn-ghost'}
              onClick={() => setType(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {type === 'SONG' ? (
          <div className="space-y-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar canción por título o artista..." />
            </label>

            {songsQuery.isLoading && <p className="text-xs text-muted">Buscando...</p>}

            {!selectedSongId && (songsQuery.data || []).length > 0 && (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-[#1b2c40] p-1">
                {(songsQuery.data || []).map((song) => (
                  <button
                    key={song.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-white hover:bg-white/[0.05]"
                    onClick={() => selectSong(song.id, song.defaultVersion?.id)}
                  >
                    <span>{song.title} <span className="text-xs text-muted">— {song.artist}</span></span>
                    <span className="text-xs text-faint">{formatKey(song.defaultVersion?.key)}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedSongId && (
              <div className="rounded-md border border-[#1b2c40] bg-[#0a1420] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">Canción seleccionada</p>
                  <button type="button" className="text-xs text-primary" onClick={() => selectSong('', '')}>Cambiar</button>
                </div>
                <label className="mt-2 block">
                  <span className="label">Versión</span>
                  <select className="select" value={selectedVersionId} onChange={(event) => setSelectedVersionId(event.target.value)}>
                    <option value="">Selecciona una versión</option>
                    {versions.map((version) => (
                      <option key={version.id} value={version.id}>{version.name}{version.isDefault ? ' (default)' : ''}</option>
                    ))}
                  </select>
                </label>
                {selectedVersion && (
                  <p className="mt-2 text-xs text-muted">{formatKey(selectedVersion.key)} · {formatBpm(selectedVersion.bpm)} · {formatDuration(selectedVersion.durationSec)}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <label>
              <span className="label">Título</span>
              <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required />
            </label>
            <label>
              <span className="label">Descripción (opcional)</span>
              <input className="input" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} />
            </label>
            <label>
              <span className="label">Duración estimada (segundos)</span>
              <input className="input" type="number" min={0} value={estimatedSec} onChange={(event) => setEstimatedSec(event.target.value)} />
            </label>
          </div>
        )}

        <label>
          <span className="label">Nota de transición (opcional)</span>
          <input className="input" value={transitionNote} onChange={(event) => setTransitionNote(event.target.value)} maxLength={2000} placeholder="Entrar con pad, oración breve..." />
        </label>

        {type === 'SONG' && (
          <div>
            <button type="button" className="text-xs font-semibold text-primary" onClick={() => setShowOverrides((current) => !current)}>
              {showOverrides ? 'Ocultar overrides' : 'Ajustar tonalidad, BPM, duración o capo para este setlist'}
            </button>
            {showOverrides && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="label">Tonalidad (override)</span>
                  <input className="input" value={keyOverride} onChange={(event) => setKeyOverride(event.target.value)} maxLength={10} placeholder={selectedVersion?.key || ''} />
                </label>
                <label>
                  <span className="label">BPM (override)</span>
                  <input className="input" type="number" min={20} max={300} value={bpmOverride} onChange={(event) => setBpmOverride(event.target.value)} placeholder={String(selectedVersion?.bpm || '')} />
                </label>
                <label>
                  <span className="label">Duración en segundos (override)</span>
                  <input className="input" type="number" min={0} value={durationOverrideSec} onChange={(event) => setDurationOverrideSec(event.target.value)} placeholder={String(selectedVersion?.durationSec || '')} />
                </label>
                <label>
                  <span className="label">Capo (0-12)</span>
                  <input className="input" type="number" min={0} max={12} value={capo} onChange={(event) => setCapo(event.target.value)} />
                </label>
              </div>
            )}
          </div>
        )}

        <label>
          <span className="label">Nota interna (opcional, solo para el equipo)</span>
          <textarea className="input min-h-[70px]" value={internalNote} onChange={(event) => setInternalNote(event.target.value)} maxLength={5000} />
        </label>

        {error && <p className="text-sm text-red-200">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {createMutation.isPending ? 'Agregando...' : 'Agregar'}
          </button>
        </div>
      </form>
    </OverlayDialog>
  );
}
