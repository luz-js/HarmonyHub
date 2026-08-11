import { Archive, ArrowLeft, LoaderCircle, Pencil, Presentation, Send, Trash2 } from 'lucide-react';
import type { SetlistDetail } from '../../../shared/types';
import { formatSetlistDuration } from '../utils';
import { SetlistStatusBadge } from './SetlistStatusBadge';

export function SetlistHeader({
  setlist,
  canManage,
  canPublish,
  canArchive,
  canDelete,
  publishing,
  archiving,
  deleting,
  onBack,
  onEdit,
  onPublish,
  onArchive,
  onDelete,
  onEnterStageMode,
}: {
  setlist: SetlistDetail;
  canManage: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canDelete: boolean;
  publishing: boolean;
  archiving: boolean;
  deleting: boolean;
  onBack: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onEnterStageMode: () => void;
}) {
  return (
    <section className="panel p-5">
      <button className="btn-ghost mb-4 h-8 px-2 text-xs" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Volver a setlists</button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{setlist.name}</h1>
            <SetlistStatusBadge status={setlist.status} />
          </div>
          {setlist.description && <p className="mt-1 text-sm text-muted">{setlist.description}</p>}
          <p className="mt-2 text-xs text-faint">{setlist.itemCount} items · Duración estimada {formatSetlistDuration(setlist.estimatedSec)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={onEnterStageMode}><Presentation className="h-4 w-4" /> Stage Mode</button>
          {canManage && <button className="btn-ghost" onClick={onEdit}><Pencil className="h-4 w-4" /> Editar</button>}
          {canPublish && setlist.status !== 'PUBLISHED' && setlist.status !== 'ARCHIVED' && (
            <button className="btn-ghost" onClick={onPublish} disabled={publishing}>
              {publishing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publicar
            </button>
          )}
          {canArchive && setlist.status !== 'ARCHIVED' && (
            <button className="btn-ghost" onClick={onArchive} disabled={archiving}>
              {archiving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />} Archivar
            </button>
          )}
          {canDelete && (
            <button className="btn-ghost text-red-300" onClick={onDelete} disabled={deleting}>
              {deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Eliminar
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
