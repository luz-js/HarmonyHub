import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileAudio,
  Link2,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { downloadSongTrack } from '../../api/songs.client';
import { useCopySongTrackReferences, useCreateSongTrack, useDeleteSongTrack, useReorderSongTracks, useSetPrimarySongTrack, useSongTracks, useUpdateSongTrack, useUploadSongTrack } from '../../hooks';
import { useAudioPlayer } from '../../player';
import { OverlayDialog } from '../shared/OverlayDialog';
import type { SongTrack, SongTrackType, SongVersion } from '../../../../shared/types';
import { getCurrentOrganizationId } from '../../../../shared/api/http';
import { formatBytes, formatTrackDuration, groupTracksByVersion, normalizeTrackOrder, trackTypeLabels } from './track.utils';

const TRACK_TYPE_OPTIONS: SongTrackType[] = ['FULL_TRACK', 'BACKING_TRACK', 'CLICK', 'PAD', 'DRUMS', 'BASS', 'GUITAR', 'KEYS', 'VOCALS', 'CHOIR', 'GUIDE', 'REFERENCE', 'OTHER'];
const STEM_TYPES = new Set<SongTrackType>(['PAD', 'DRUMS', 'BASS', 'GUITAR', 'KEYS', 'VOCALS', 'CHOIR']);

type TrackFilter = 'all' | 'active' | 'general' | 'backing' | 'stems' | 'reference';

type TrackDraft = {
  name: string;
  type: SongTrackType;
  instrument: string;
  versionId: string;
  isPrimary: boolean;
  url: string;
  active: boolean;
};

function defaultDraft(activeVersionId?: string | null): TrackDraft {
  return {
    name: '',
    type: 'FULL_TRACK',
    instrument: '',
    versionId: activeVersionId || '',
    isPrimary: false,
    url: '',
    active: true,
  };
}

function isExternalTrack(track: SongTrack) {
  return track.provider === 'EXTERNAL_URL' || track.provider === 'OTHER';
}

function filterTracks(tracks: SongTrack[], activeVersionId: string | null, filter: TrackFilter) {
  switch (filter) {
    case 'active':
      return tracks.filter((track) => track.versionId === null || track.versionId === activeVersionId);
    case 'general':
      return tracks.filter((track) => track.versionId === null);
    case 'backing':
      return tracks.filter((track) => track.type === 'BACKING_TRACK');
    case 'stems':
      return tracks.filter((track) => STEM_TYPES.has(track.type));
    case 'reference':
      return tracks.filter((track) => track.type === 'REFERENCE' || track.type === 'FULL_TRACK' || track.type === 'GUIDE');
    case 'all':
    default:
      return tracks;
  }
}

async function detectAudioDuration(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const audio = document.createElement('audio');
  audio.preload = 'metadata';
  audio.src = objectUrl;

  try {
    const duration = await new Promise<number | null>((resolve) => {
      audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration) : null);
      audio.onerror = () => resolve(null);
    });
    return duration ?? undefined;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function songTrackFileName(songTitle: string, track: SongTrack) {
  const ext = track.originalFileName?.split('.').pop() || track.url.split('.').pop() || 'mp3';
  return `${songTitle} - ${track.name}.${ext}`.replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-');
}

function TrackTypeBadge({ type }: { type: SongTrackType }) {
  return <span className="rounded-full border border-[#173347] bg-[#081821] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8cdff0]">{trackTypeLabels[type]}</span>;
}

function TrackEmptyState({ canManage, onUpload, onExternal }: { canManage: boolean; onUpload: () => void; onExternal: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#1b2c40] bg-[#08131d] px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#173347] bg-[#0b1b24] text-[#00E6A3]">
        <FileAudio className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-white">Esta canción todavía no tiene pistas.</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">Sube un audio completo, una pista de ensayo o un stem para empezar a organizar el material musical de esta versión.</p>
      {canManage && (
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button className="btn-primary" onClick={onUpload}><Upload className="h-4 w-4" /> Subir pista</button>
          <button className="btn-ghost" onClick={onExternal}><Link2 className="h-4 w-4" /> Agregar URL</button>
        </div>
      )}
    </div>
  );
}

function TrackFormFields({
  draft,
  versions,
  onChange,
  allowUrl,
}: {
  draft: TrackDraft;
  versions: SongVersion[];
  onChange: (patch: Partial<TrackDraft>) => void;
  allowUrl?: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label>
        <span className="label">Nombre visible</span>
        <input className="input" value={draft.name} onChange={(event) => onChange({ name: event.target.value })} maxLength={120} />
      </label>
      <label>
        <span className="label">Tipo</span>
        <select className="select" value={draft.type} onChange={(event) => onChange({ type: event.target.value as SongTrackType })}>
          {TRACK_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{trackTypeLabels[type]}</option>)}
        </select>
      </label>
      <label>
        <span className="label">Versión asociada</span>
        <select className="select" value={draft.versionId} onChange={(event) => onChange({ versionId: event.target.value })}>
          <option value="">General de la canción</option>
          {versions.map((version) => <option key={version.id} value={version.id}>{version.name}</option>)}
        </select>
      </label>
      <label>
        <span className="label">Instrumento</span>
        <input className="input" value={draft.instrument} onChange={(event) => onChange({ instrument: event.target.value })} maxLength={80} placeholder="Guitarra eléctrica, click, voz..." />
      </label>
      {allowUrl && (
        <label className="md:col-span-2">
          <span className="label">URL</span>
          <input className="input" value={draft.url} onChange={(event) => onChange({ url: event.target.value })} placeholder="https://..." />
        </label>
      )}
      <label className="flex items-center gap-2 text-sm text-muted md:col-span-2">
        <input type="checkbox" checked={draft.isPrimary} onChange={(event) => onChange({ isPrimary: event.target.checked })} />
        Marcar como pista principal dentro de este contexto
      </label>
    </div>
  );
}

function TrackRow({
  track,
  versions,
  canManage,
  isCurrent,
  isPlaying,
  onPlay,
  onDownload,
  onEdit,
  onDelete,
  onSetPrimary,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  track: SongTrack;
  versions: SongVersion[];
  canManage: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
  onMove: (direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  return (
    <article className={`rounded-2xl border p-4 transition ${isCurrent ? 'border-[#00E6A3]/35 bg-[#0c1e22]' : 'border-[#1b2c40] bg-[#091522]'}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#184056] bg-[#071118] text-[#00E6A3]" onClick={onPlay} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">{track.name}</p>
              {track.isPrimary && <span className="rounded-full border border-[#00E6A3]/25 bg-[#00E6A3]/12 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7ef7cc]">Principal</span>}
              {!track.active && <span className="badge">Inactiva</span>}
            </div>
            <p className="mt-1 text-xs text-muted">
              {track.versionId ? versions.find((version) => version.id === track.versionId)?.name || track.version?.name || 'Versión' : 'General'} · {track.instrument || 'Sin instrumento'} · {formatTrackDuration(track.durationSec)} · {formatBytes(track.sizeBytes)}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:justify-end">
          <TrackTypeBadge type={track.type} />
          <button type="button" className="btn-ghost h-9 px-3" onClick={onDownload}><Download className="h-4 w-4" /> Descargar</button>
          {isExternalTrack(track) && <a className="btn-ghost h-9 px-3" href={track.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Abrir</a>}
          {canManage && (
            <>
              <button type="button" className="btn-ghost h-9 px-3" onClick={onEdit}>Editar</button>
              <button type="button" className="btn-ghost h-9 px-3" onClick={onSetPrimary}><Star className="h-4 w-4" /> Principal</button>
              <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label="Mover arriba"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={() => onMove(1)} disabled={!canMoveDown} aria-label="Mover abajo"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" className="btn-danger h-9 w-9 p-0" onClick={onDelete} aria-label="Eliminar pista"><Trash2 className="h-4 w-4" /></button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function SongTracksPanel({
  songId,
  songTitle,
  versions,
  activeVersionId,
  canManage,
  onChanged,
}: {
  songId: string;
  songTitle: string;
  versions: SongVersion[];
  activeVersionId: string | null;
  canManage: boolean;
  onChanged?: () => void;
}) {
  const organizationId = getCurrentOrganizationId() || '';
  const tracksQuery = useSongTracks(organizationId, songId);
  const createMutation = useCreateSongTrack(organizationId, songId);
  const uploadMutation = useUploadSongTrack(organizationId, songId);
  const updateMutation = useUpdateSongTrack(organizationId, songId);
  const deleteMutation = useDeleteSongTrack(organizationId, songId);
  const setPrimaryMutation = useSetPrimarySongTrack(organizationId, songId);
  const reorderMutation = useReorderSongTracks(organizationId, songId);
  const copyMutation = useCopySongTrackReferences(organizationId, songId);
  const { currentTrack, error: playerError, isLoading: playerLoading, isPlaying, playTrack, setPlaybackQueue } = useAudioPlayer();

  const [filter, setFilter] = useState<TrackFilter>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showExternalDialog, setShowExternalDialog] = useState(false);
  const [editingTrack, setEditingTrack] = useState<SongTrack | null>(null);
  const [draft, setDraft] = useState<TrackDraft>(() => defaultDraft(activeVersionId));
  const [externalDraft, setExternalDraft] = useState<TrackDraft>(() => defaultDraft(activeVersionId));
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [externalError, setExternalError] = useState('');
  const [editError, setEditError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const tracks = useMemo(() => tracksQuery.data || [], [tracksQuery.data]);
  const filteredTracks = useMemo(() => filterTracks(tracks, activeVersionId, filter), [tracks, activeVersionId, filter]);
  const grouped = useMemo(() => groupTracksByVersion(filteredTracks, activeVersionId), [filteredTracks, activeVersionId]);

  // El contexto de reproduccion (anterior/siguiente) respeta el filtro y el orden
  // logico visible: pistas de la version activa, luego generales, luego otras versiones.
  const orderedVisible = useMemo(
    () => [...grouped.versionTracks, ...grouped.generalTracks, ...grouped.otherVersionTracks],
    [grouped],
  );
  const orderedVisibleKey = orderedVisible.map((track) => track.id).join('|');

  useEffect(() => {
    setPlaybackQueue(orderedVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedVisibleKey]);

  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copySource, setCopySource] = useState('');
  const [copyTarget, setCopyTarget] = useState('');
  const [copyError, setCopyError] = useState('');
  const [copyResult, setCopyResult] = useState<string | null>(null);

  function notifyChange() {
    onChanged?.();
  }

  function openCopyDialog() {
    const target = activeVersionId || versions[0]?.id || '';
    const source = versions.find((version) => version.id !== target)?.id || '';
    setCopyTarget(target);
    setCopySource(source);
    setCopyError('');
    setCopyResult(null);
    setShowCopyDialog(true);
  }

  async function submitCopy(event: FormEvent) {
    event.preventDefault();
    setCopyError('');
    setCopyResult(null);
    if (!copySource || !copyTarget) {
      setCopyError('Selecciona la versión de origen y la de destino.');
      return;
    }
    if (copySource === copyTarget) {
      setCopyError('El origen y el destino deben ser versiones distintas.');
      return;
    }
    try {
      const result = await copyMutation.mutateAsync({ sourceVersionId: copySource, targetVersionId: copyTarget });
      notifyChange();
      if (result.copied === 0) {
        setCopyResult('La versión de origen no tiene pistas para copiar.');
      } else {
        setCopyResult(`Se copiaron ${result.copied} referencia(s) de pista. No se marcó ninguna como principal.`);
      }
    } catch (error: any) {
      setCopyError(error?.message || 'No se pudieron copiar las pistas');
    }
  }

  function resetUploadState() {
    setUploadFile(null);
    setUploadError('');
    setUploadProgress(null);
    setDraft(defaultDraft(activeVersionId));
  }

  function resetExternalState() {
    setExternalError('');
    setExternalDraft(defaultDraft(activeVersionId));
  }

  async function handleUploadFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] || null;
    setUploadFile(nextFile);
    if (!nextFile) return;
    const duration = await detectAudioDuration(nextFile);
      setDraft((current) => ({ ...current, name: current.name || nextFile.name.replace(/\.[^.]+$/, '') }));
    if (duration) {
      setDraft((current) => ({ ...current, name: current.name || nextFile.name.replace(/\.[^.]+$/, '') }));
    }
  }

  async function submitUpload(event: FormEvent) {
    event.preventDefault();
    if (!uploadFile) {
      setUploadError('Selecciona un archivo de audio.');
      return;
    }
    setUploadError('');
    const detectedDuration = await detectAudioDuration(uploadFile);
    try {
      await uploadMutation.mutateAsync({
        input: {
          file: uploadFile,
          name: draft.name || uploadFile.name.replace(/\.[^.]+$/, ''),
          type: draft.type,
          instrument: draft.instrument || undefined,
          versionId: draft.versionId || null,
          isPrimary: draft.isPrimary,
          durationSec: detectedDuration,
        },
        onProgress: setUploadProgress,
      });
      notifyChange();
      resetUploadState();
      setShowUploadDialog(false);
    } catch (error: any) {
      setUploadError(error?.message || 'No se pudo subir la pista');
    }
  }

  async function submitExternal(event: FormEvent) {
    event.preventDefault();
    setExternalError('');
    try {
      await createMutation.mutateAsync({
        name: externalDraft.name,
        type: externalDraft.type,
        instrument: externalDraft.instrument || undefined,
        url: externalDraft.url,
        versionId: externalDraft.versionId || null,
        isPrimary: externalDraft.isPrimary,
        provider: 'EXTERNAL_URL',
      });
      notifyChange();
      resetExternalState();
      setShowExternalDialog(false);
    } catch (error: any) {
      setExternalError(error?.message || 'No se pudo registrar la pista');
    }
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingTrack) return;
    setEditError('');
    try {
      await updateMutation.mutateAsync({
        trackId: editingTrack.id,
        input: {
          name: draft.name,
          type: draft.type,
          instrument: draft.instrument || null,
          url: isExternalTrack(editingTrack) ? draft.url || undefined : undefined,
          versionId: draft.versionId || null,
          isPrimary: draft.isPrimary,
          active: draft.active,
        },
      });
      notifyChange();
      setEditingTrack(null);
    } catch (error: any) {
      setEditError(error?.message || 'No se pudo actualizar la pista');
    }
  }

  async function handleDownload(track: SongTrack) {
    if (isExternalTrack(track)) {
      window.open(track.url, '_blank', 'noopener,noreferrer');
      return;
    }
    const blob = await downloadSongTrack(track.songId, track.id);
    await saveBlob(blob, songTrackFileName(songTitle, track));
  }

  async function handleMove(track: SongTrack, direction: -1 | 1) {
    const contextTracks = normalizeTrackOrder(tracks.filter((item) => item.versionId === track.versionId));
    const currentIndex = contextTracks.findIndex((item) => item.id === track.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= contextTracks.length) return;
    const reordered = [...contextTracks];
    const [item] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, item);
    try {
      await reorderMutation.mutateAsync({
        versionId: track.versionId,
        items: reordered.map((entry, index) => ({ id: entry.id, sortOrder: index })),
      });
      notifyChange();
    } catch {
      // handled by mutation state in panel
    }
  }

  async function handleDelete(track: SongTrack) {
    if (!window.confirm(`Eliminar la pista "${track.name}"?`)) return;
    await deleteMutation.mutateAsync(track.id);
    notifyChange();
  }

  const loading = tracksQuery.isLoading;
  const error = tracksQuery.error instanceof Error ? tracksQuery.error.message : '';

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#1b2c40] bg-[#07131d] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00D4C8]">Biblioteca de pistas</p>
            <h2 className="mt-2 text-xl font-bold text-white">Audios de ensayo, stems y referencias</h2>
            <p className="mt-1 text-sm text-muted">Reproduce una pista a la vez, ordénalas por contexto y define una principal por canción o por versión.</p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" onClick={() => setShowUploadDialog(true)}><Upload className="h-4 w-4" /> Subir pista</button>
              <button className="btn-ghost" onClick={() => setShowExternalDialog(true)}><Link2 className="h-4 w-4" /> Agregar URL</button>
              {versions.length >= 2 && (
                <button className="btn-ghost" onClick={openCopyDialog}><Copy className="h-4 w-4" /> Copiar entre versiones</button>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ['all', 'Todas'],
            ['active', 'Versión activa'],
            ['general', 'Generales'],
            ['backing', 'Backing'],
            ['stems', 'Stems'],
            ['reference', 'Referencias'],
          ].map(([key, label]) => (
            <button key={key} className={filter === key ? 'btn-primary' : 'btn-ghost'} onClick={() => setFilter(key as TrackFilter)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {loading && <section className="panel p-5 text-muted">Cargando pistas...</section>}
      {error && <section className="rounded-md border border-[#ff5c77]/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</section>}
      {!loading && !error && filteredTracks.length === 0 && <TrackEmptyState canManage={canManage} onUpload={() => setShowUploadDialog(true)} onExternal={() => setShowExternalDialog(true)} />}

      {!loading && !error && filteredTracks.length > 0 && (
        <div className="space-y-5">
          {grouped.versionTracks.length > 0 && (
            <section className="panel p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">Pistas de esta versión</h3>
                  <p className="text-xs text-muted">{versions.find((version) => version.id === activeVersionId)?.name || 'Versión activa'}</p>
                </div>
                <span className="badge badge-primary">{grouped.versionTracks.length}</span>
              </div>
              <div className="space-y-3">
                {grouped.versionTracks.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    versions={versions}
                    canManage={canManage}
                    isCurrent={currentTrack?.id === track.id}
                    isPlaying={currentTrack?.id === track.id && isPlaying}
                    onPlay={() => void playTrack(track, { songTitle })}
                    onDownload={() => void handleDownload(track)}
                    onEdit={() => {
                      setDraft({
                        name: track.name,
                        type: track.type,
                        instrument: track.instrument || '',
                        versionId: track.versionId || '',
                        isPrimary: track.isPrimary,
                        url: track.url,
                        active: track.active,
                      });
                      setEditError('');
                      setEditingTrack(track);
                    }}
                    onDelete={() => void handleDelete(track)}
                    onSetPrimary={() => void setPrimaryMutation.mutateAsync(track.id).then(notifyChange)}
                    onMove={(direction) => void handleMove(track, direction)}
                    canMoveUp={index > 0}
                    canMoveDown={index < grouped.versionTracks.length - 1}
                  />
                ))}
              </div>
            </section>
          )}

          {grouped.generalTracks.length > 0 && (
            <section className="panel p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">Pistas generales</h3>
                  <p className="text-xs text-muted">Disponibles para cualquier versión de esta canción.</p>
                </div>
                <span className="badge">{grouped.generalTracks.length}</span>
              </div>
              <div className="space-y-3">
                {grouped.generalTracks.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    versions={versions}
                    canManage={canManage}
                    isCurrent={currentTrack?.id === track.id}
                    isPlaying={currentTrack?.id === track.id && isPlaying}
                    onPlay={() => void playTrack(track, { songTitle })}
                    onDownload={() => void handleDownload(track)}
                    onEdit={() => {
                      setDraft({
                        name: track.name,
                        type: track.type,
                        instrument: track.instrument || '',
                        versionId: '',
                        isPrimary: track.isPrimary,
                        url: track.url,
                        active: track.active,
                      });
                      setEditError('');
                      setEditingTrack(track);
                    }}
                    onDelete={() => void handleDelete(track)}
                    onSetPrimary={() => void setPrimaryMutation.mutateAsync(track.id).then(notifyChange)}
                    onMove={(direction) => void handleMove(track, direction)}
                    canMoveUp={index > 0}
                    canMoveDown={index < grouped.generalTracks.length - 1}
                  />
                ))}
              </div>
            </section>
          )}

          {grouped.otherVersionTracks.length > 0 && (
            <section className="panel p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">Otras versiones</h3>
                  <p className="text-xs text-muted">Material asociado a otras variantes musicales de esta canción.</p>
                </div>
                <span className="badge badge-blue">{grouped.otherVersionTracks.length}</span>
              </div>
              <div className="space-y-3">
                {grouped.otherVersionTracks.map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    versions={versions}
                    canManage={canManage}
                    isCurrent={currentTrack?.id === track.id}
                    isPlaying={currentTrack?.id === track.id && isPlaying}
                    onPlay={() => void playTrack(track, { songTitle })}
                    onDownload={() => void handleDownload(track)}
                    onEdit={() => {
                      setDraft({
                        name: track.name,
                        type: track.type,
                        instrument: track.instrument || '',
                        versionId: track.versionId || '',
                        isPrimary: track.isPrimary,
                        url: track.url,
                        active: track.active,
                      });
                      setEditError('');
                      setEditingTrack(track);
                    }}
                    onDelete={() => void handleDelete(track)}
                    onSetPrimary={() => void setPrimaryMutation.mutateAsync(track.id).then(notifyChange)}
                    onMove={(direction) => void handleMove(track, direction)}
                    canMoveUp={false}
                    canMoveDown={false}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {playerError && <section className="rounded-md border border-[#ff5c77]/30 bg-red-500/10 p-4 text-sm text-red-200">{playerError}</section>}
      {playerLoading && <section className="rounded-md border border-[#1b2c40] bg-[#08131d] p-4 text-sm text-muted">Preparando reproducción...</section>}

      {showUploadDialog && (
        <OverlayDialog title="Subir pista" subtitle="Formatos admitidos: mp3, wav, ogg, m4a, aac, flac, webm · Máximo 100 MB" onClose={() => {
          resetUploadState();
          setShowUploadDialog(false);
        }}>
          <form className="space-y-4" onSubmit={submitUpload}>
            <label className="block rounded-2xl border border-dashed border-[#1b2c40] bg-[#06101a] p-4 text-sm text-muted">
              <span className="mb-2 block text-white">Archivo de audio</span>
              <input type="file" accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,.webm,audio/*" onChange={(event) => void handleUploadFileChange(event)} />
              {uploadFile && <p className="mt-2 text-xs text-muted">{uploadFile.name} · {formatBytes(uploadFile.size)}</p>}
            </label>
            <TrackFormFields draft={draft} versions={versions} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} />
            {uploadProgress !== null && (
              <div className="rounded-xl border border-[#173347] bg-[#081821] p-3 text-sm text-muted">
                <div className="flex items-center justify-between gap-3">
                  <span>Subiendo...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[#102635]">
                  <div className="h-2 rounded-full bg-[#00E6A3]" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
            {uploadError && <p className="text-sm text-red-200">{uploadError}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={() => {
                resetUploadState();
                setShowUploadDialog(false);
              }}>Cancelar</button>
              <button className="btn-primary" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadMutation.isPending ? 'Subiendo...' : 'Subir pista'}
              </button>
            </div>
          </form>
        </OverlayDialog>
      )}

      {showExternalDialog && (
        <OverlayDialog title="Agregar URL externa" subtitle="Úsalo para demos, referencias o pistas alojadas fuera de HarmonyHub." onClose={() => {
          resetExternalState();
          setShowExternalDialog(false);
        }}>
          <form className="space-y-4" onSubmit={submitExternal}>
            <TrackFormFields draft={externalDraft} versions={versions} onChange={(patch) => setExternalDraft((current) => ({ ...current, ...patch }))} allowUrl />
            {externalError && <p className="text-sm text-red-200">{externalError}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={() => {
                resetExternalState();
                setShowExternalDialog(false);
              }}>Cancelar</button>
              <button className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {createMutation.isPending ? 'Guardando...' : 'Guardar URL'}
              </button>
            </div>
          </form>
        </OverlayDialog>
      )}

      {editingTrack && (
        <OverlayDialog title="Editar pista" subtitle={editingTrack.originalFileName || editingTrack.name} onClose={() => setEditingTrack(null)}>
          <form className="space-y-4" onSubmit={submitEdit}>
            <TrackFormFields draft={draft} versions={versions} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} allowUrl={isExternalTrack(editingTrack)} />
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} />
              Pista activa
            </label>
            {editError && <p className="text-sm text-red-200">{editError}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={() => setEditingTrack(null)}>Cancelar</button>
              <button className="btn-primary" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </OverlayDialog>
      )}

      {showCopyDialog && (
        <OverlayDialog
          title="Copiar pistas entre versiones"
          subtitle="Se copian las referencias de audio (no se duplica el archivo). Las copias no se marcan como principal."
          onClose={() => setShowCopyDialog(false)}
        >
          <form className="space-y-4" onSubmit={submitCopy}>
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="label">Versión de origen</span>
                <select className="select" value={copySource} onChange={(event) => setCopySource(event.target.value)}>
                  <option value="">Selecciona una versión</option>
                  {versions.map((version) => <option key={version.id} value={version.id}>{version.name}</option>)}
                </select>
              </label>
              <label>
                <span className="label">Versión de destino</span>
                <select className="select" value={copyTarget} onChange={(event) => setCopyTarget(event.target.value)}>
                  <option value="">Selecciona una versión</option>
                  {versions.map((version) => <option key={version.id} value={version.id}>{version.name}</option>)}
                </select>
              </label>
            </div>
            <p className="text-xs text-muted">Solo se copian las pistas asociadas a la versión de origen. Las pistas generales de la canción no se incluyen.</p>
            {copyError && <p className="text-sm text-red-200">{copyError}</p>}
            {copyResult && <p className="text-sm text-[#7ef7cc]">{copyResult}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={() => setShowCopyDialog(false)}>Cerrar</button>
              <button className="btn-primary" disabled={copyMutation.isPending}>
                {copyMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                {copyMutation.isPending ? 'Copiando...' : 'Copiar referencias'}
              </button>
            </div>
          </form>
        </OverlayDialog>
      )}
    </div>
  );
}
