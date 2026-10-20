import { Archive, ArrowLeft, CopyPlus, LoaderCircle, Pencil, Presentation, Send, Trash2 } from 'lucide-react';
import type { SetlistDetail } from '../../../shared/types';
import { plural } from '../../../shared/utils/format';
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
  savingTemplate,
  onBack,
  onEdit,
  onPublish,
  onArchive,
  onDelete,
  onEnterStageMode,
  onSaveAsTemplate,
  onCreateFromTemplate,
}: {
  setlist: SetlistDetail;
  canManage: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canDelete: boolean;
  publishing: boolean;
  archiving: boolean;
  deleting: boolean;
  savingTemplate?: boolean;
  onBack: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onEnterStageMode: () => void;
  onSaveAsTemplate?: () => void;
  onCreateFromTemplate?: () => void;
}) {
  return (
    <section className="space-y-4">
      <button className="-ml-2 inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted transition hover:text-white" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Setlists
      </button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <SetlistStatusBadge status={setlist.status} />
            {setlist.isTemplate && <span className="badge badge-purple">Plantilla</span>}
          </div>
          <h1 className="page-title">{setlist.name}</h1>
          {setlist.description && <p className="text-[15px] text-[#D8D5CE]">{setlist.description}</p>}
          <p className="text-sm text-muted">
            {plural(setlist.itemCount, 'elemento')}
            {setlist.estimatedSec > 0 && ` · Duración estimada ${formatSetlistDuration(setlist.estimatedSec)}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!setlist.isTemplate && <button className="btn-primary" onClick={onEnterStageMode}><Presentation className="h-4 w-4" /> Stage Mode</button>}
          {setlist.isTemplate ? (
            onCreateFromTemplate && <button className="btn-primary" onClick={onCreateFromTemplate}><CopyPlus className="h-4 w-4" /> Usar plantilla</button>
          ) : (
            canManage && onSaveAsTemplate && (
              <button className="btn-ghost" onClick={onSaveAsTemplate} disabled={savingTemplate}>
                {savingTemplate ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CopyPlus className="h-4 w-4" />} Guardar como plantilla
              </button>
            )
          )}
          {canManage && <button className="btn-ghost" onClick={onEdit}><Pencil className="h-4 w-4" /> Editar</button>}
          {!setlist.isTemplate && canPublish && setlist.status !== 'PUBLISHED' && setlist.status !== 'ARCHIVED' && (
            <button className="btn-ghost" onClick={onPublish} disabled={publishing}>
              {publishing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publicar
            </button>
          )}
          {!setlist.isTemplate && canArchive && setlist.status !== 'ARCHIVED' && (
            <button className="btn-ghost" onClick={onArchive} disabled={archiving}>
              {archiving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />} Archivar
            </button>
          )}
          {canDelete && (
            <button className="btn-danger" onClick={onDelete} disabled={deleting}>
              {deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Eliminar
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
