import { ArrowDown, ArrowUp, Download, Eye, Pencil, Star, Trash2 } from 'lucide-react';
import type { SongFile, SongVersion } from '../../../../shared/types';
import { FileCategoryBadge } from './FileCategoryBadge';
import { formatBytes, getFileExtension } from './file.utils';

export function SongFileCard({
  file,
  versions,
  canManage,
  canMoveUp,
  canMoveDown,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  onSetPrimary,
  onMove,
}: {
  file: SongFile;
  versions: SongVersion[];
  canManage: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const versionLabel = file.versionId ? versions.find((version) => version.id === file.versionId)?.name || file.version?.name || 'Versión' : 'General';
  const extension = getFileExtension(file.file.originalName || file.file.name);

  return (
    <article className={`rounded-2xl border p-4 transition ${file.isPrimary ? 'border-[#00E6A3]/35 bg-[#0c1e22]' : 'border-[#1b2c40] bg-[#091522]'}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#184056] bg-[#071118] text-[#00E6A3]" onClick={onPreview} aria-label="Previsualizar">
            <Eye className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">{file.title}</p>
              {file.isPrimary && <span className="rounded-full border border-[#00E6A3]/25 bg-[#00E6A3]/12 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7ef7cc]">Principal</span>}
              {!file.active && <span className="badge">Inactivo</span>}
            </div>
            <p className="mt-1 text-xs text-muted">
              {versionLabel} · {extension || 'Archivo'} · {formatBytes(file.file.sizeBytes)} · {file.file.uploadedBy?.name || 'Sin autor'}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:justify-end">
          <FileCategoryBadge category={file.category} />
          <button type="button" className="btn-ghost h-9 px-3" onClick={onDownload}><Download className="h-4 w-4" /> Descargar</button>
          {canManage && (
            <>
              <button type="button" className="btn-ghost h-9 px-3" onClick={onEdit}><Pencil className="h-4 w-4" /> Editar</button>
              {!file.isPrimary && <button type="button" className="btn-ghost h-9 px-3" onClick={onSetPrimary}><Star className="h-4 w-4" /> Principal</button>}
              <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label="Mover arriba"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={() => onMove(1)} disabled={!canMoveDown} aria-label="Mover abajo"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" className="btn-danger h-9 w-9 p-0" onClick={onDelete} aria-label="Eliminar archivo"><Trash2 className="h-4 w-4" /></button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
