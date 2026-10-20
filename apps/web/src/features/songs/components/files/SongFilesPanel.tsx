import { FormEvent, useMemo, useState } from 'react';
import { Check, FileStack, LoaderCircle, Upload } from 'lucide-react';
import {
  useDeleteSongFile,
  useReorderSongFiles,
  useSetPrimarySongFile,
  useSongFiles,
  useUpdateSongFile,
  useUploadSongFile,
} from '../../hooks';
import type { SongFile, SongVersion } from '../../../../shared/types';
import { downloadSongFile } from '../../api/songs.client';
import { getCurrentOrganizationId } from '../../../../shared/api/http';
import { OverlayDialog } from '../shared/OverlayDialog';
import { FileMetadataFields, defaultSongFileDraft, SongFileDraft } from './FileMetadataFields';
import { FilePreviewDialog } from './FilePreviewDialog';
import { FileUploadDialog } from './FileUploadDialog';
import { SongFileCard } from './SongFileCard';
import { FILE_FILTER_OPTIONS, FileFilter, filterSongFiles, groupFilesByVersion, normalizeFileOrder } from './file.utils';

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

function songFileName(songTitle: string, file: SongFile) {
  const extension = file.file.originalName?.split('.').pop() || file.file.name.split('.').pop() || 'archivo';
  return `${songTitle} - ${file.title}.${extension}`.replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-');
}

export function SongFilesPanel({
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
  const filesQuery = useSongFiles(organizationId, songId);
  const uploadMutation = useUploadSongFile(organizationId, songId);
  const updateMutation = useUpdateSongFile(organizationId, songId);
  const deleteMutation = useDeleteSongFile(organizationId, songId);
  const setPrimaryMutation = useSetPrimarySongFile(organizationId, songId);
  const reorderMutation = useReorderSongFiles(organizationId, songId);

  const [filter, setFilter] = useState<FileFilter>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [editingFile, setEditingFile] = useState<SongFile | null>(null);
  const [editDraft, setEditDraft] = useState<SongFileDraft>(defaultSongFileDraft(activeVersionId));
  const [editError, setEditError] = useState('');
  const [previewFile, setPreviewFile] = useState<SongFile | null>(null);

  const files = useMemo(() => filesQuery.data || [], [filesQuery.data]);
  const filteredFiles = useMemo(() => filterSongFiles(files, filter), [files, filter]);
  const grouped = useMemo(() => groupFilesByVersion(filteredFiles, activeVersionId), [filteredFiles, activeVersionId]);

  function notifyChange() {
    onChanged?.();
  }

  async function handleUpload({ file, draft }: { file: File; draft: SongFileDraft }) {
    setUploadError('');
    if (!draft.title.trim()) {
      setUploadError('El título es requerido.');
      return;
    }
    try {
      await uploadMutation.mutateAsync({
        input: {
          file,
          title: draft.title,
          description: draft.description || undefined,
          category: draft.category,
          versionId: draft.versionId || null,
          isPrimary: draft.isPrimary,
        },
        onProgress: setUploadProgress,
      });
      notifyChange();
      setUploadProgress(null);
      setShowUploadDialog(false);
    } catch (error: any) {
      setUploadProgress(null);
      setUploadError(error?.message || 'No se pudo subir el archivo');
    }
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingFile) return;
    setEditError('');
    if (!editDraft.title.trim()) {
      setEditError('El título es requerido.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        songFileId: editingFile.id,
        input: {
          title: editDraft.title,
          description: editDraft.description || null,
          category: editDraft.category,
          versionId: editDraft.versionId || null,
          isPrimary: editDraft.isPrimary,
        },
      });
      notifyChange();
      setEditingFile(null);
    } catch (error: any) {
      setEditError(error?.message || 'No se pudo actualizar el archivo');
    }
  }

  async function handleDownload(file: SongFile) {
    const blob = await downloadSongFile(file.songId, file.id);
    await saveBlob(blob, songFileName(songTitle, file));
  }

  async function handleDelete(file: SongFile) {
    if (!window.confirm(`¿Eliminar el archivo "${file.title}"?`)) return;
    await deleteMutation.mutateAsync(file.id);
    notifyChange();
  }

  async function handleMove(file: SongFile, direction: -1 | 1) {
    const contextFiles = normalizeFileOrder(files.filter((item) => item.versionId === file.versionId));
    const currentIndex = contextFiles.findIndex((item) => item.id === file.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= contextFiles.length) return;
    const reordered = [...contextFiles];
    const [item] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, item);
    await reorderMutation.mutateAsync({
      versionId: file.versionId,
      items: reordered.map((entry, index) => ({ id: entry.id, sortOrder: index })),
    });
    notifyChange();
  }

  function renderGroup(title: string, subtitle: string, groupFiles: SongFile[], badgeClass: string) {
    if (groupFiles.length === 0) return null;
    return (
      <section className="panel p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="text-xs text-muted">{subtitle}</p>
          </div>
          <span className={`badge ${badgeClass}`}>{groupFiles.length}</span>
        </div>
        <div className="space-y-3">
          {groupFiles.map((file, index) => (
            <SongFileCard
              key={file.id}
              file={file}
              versions={versions}
              canManage={canManage}
              canMoveUp={index > 0}
              canMoveDown={index < groupFiles.length - 1}
              onPreview={() => setPreviewFile(file)}
              onDownload={() => void handleDownload(file)}
              onEdit={() => {
                setEditError('');
                setEditDraft({ title: file.title, description: file.description || '', category: file.category, versionId: file.versionId || '', isPrimary: file.isPrimary });
                setEditingFile(file);
              }}
              onDelete={() => void handleDelete(file)}
              onSetPrimary={() => void setPrimaryMutation.mutateAsync(file.id).then(notifyChange)}
              onMove={(direction) => void handleMove(file, direction)}
            />
          ))}
        </div>
      </section>
    );
  }

  const loading = filesQuery.isLoading;
  const error = filesQuery.error instanceof Error ? filesQuery.error.message : '';

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#30333A] bg-[#141518] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Biblioteca musical</p>
            <h2 className="mt-2 text-xl font-bold text-white">Letras, charts, partituras y documentos</h2>
            <p className="mt-1 text-sm text-muted">Organiza letras, acordes, partituras, imágenes de referencia y documentos de dirección musical.</p>
          </div>
          {canManage && (
            <button className="btn-primary" onClick={() => setShowUploadDialog(true)}><Upload className="h-4 w-4" /> Subir archivo</button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {FILE_FILTER_OPTIONS.map(([key, label]) => (
            <button key={key} className={filter === key ? 'btn-primary' : 'btn-ghost'} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {loading && <section className="panel p-5 text-muted">Cargando archivos...</section>}
      {error && <section className="rounded-md border border-[#F27A6E]/30 bg-[#2A1817] p-4 text-sm text-[#F7A39A]">{error}</section>}

      {!loading && !error && filteredFiles.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#30333A] bg-[#141518] px-6 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#30333A] bg-[#23252A] text-primary">
            <FileStack className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-white">Esta canción todavía no tiene archivos.</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">Agrega letras, charts, partituras, imágenes o documentos para esta canción.</p>
          {canManage && (
            <div className="mt-5 flex justify-center">
              <button className="btn-primary" onClick={() => setShowUploadDialog(true)}><Upload className="h-4 w-4" /> Subir archivo</button>
            </div>
          )}
        </div>
      )}

      {!loading && !error && filteredFiles.length > 0 && (
        <div className="space-y-5">
          {renderGroup('Archivos de esta versión', versions.find((version) => version.id === activeVersionId)?.name || 'Versión activa', grouped.versionFiles, 'badge-primary')}
          {renderGroup('Archivos generales', 'Disponibles para cualquier versión de esta canción.', grouped.generalFiles, 'badge')}
          {renderGroup('Otras versiones', 'Material asociado a otras variantes musicales.', grouped.otherVersionFiles, 'badge-blue')}
        </div>
      )}

      {showUploadDialog && (
        <FileUploadDialog
          versions={versions}
          activeVersionId={activeVersionId}
          submitting={uploadMutation.isPending}
          progress={uploadProgress}
          error={uploadError}
          onSubmit={(payload) => void handleUpload(payload)}
          onClose={() => {
            setUploadError('');
            setUploadProgress(null);
            setShowUploadDialog(false);
          }}
        />
      )}

      {editingFile && (
        <OverlayDialog title="Editar archivo" subtitle={editingFile.file.originalName || editingFile.file.name} onClose={() => setEditingFile(null)}>
          <form className="space-y-4" onSubmit={submitEdit}>
            <FileMetadataFields draft={editDraft} versions={versions} onChange={(patch) => setEditDraft((current) => ({ ...current, ...patch }))} />
            {editError && <p className="text-sm text-[#F7A39A]">{editError}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={() => setEditingFile(null)}>Cancelar</button>
              <button className="btn-primary" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </OverlayDialog>
      )}

      {previewFile && (
        <FilePreviewDialog songFile={previewFile} songTitle={songTitle} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}
