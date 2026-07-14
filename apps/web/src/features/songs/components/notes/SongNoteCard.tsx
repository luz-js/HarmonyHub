import { Archive, ArchiveRestore, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import type { SongNote } from '../../../../shared/types';
import { NoteVisibilityBadge } from './NoteVisibilityBadge';

function formatNoteDate(value: string) {
  return new Date(value).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function SongNoteCard({
  note,
  canManage,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleArchive,
}: {
  note: SongNote;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
}) {
  return (
    <article className={`rounded-2xl border p-4 transition ${note.isPinned ? 'border-[#00E6A3]/35 bg-[#0c1e22]' : 'border-[#1b2c40] bg-[#091522]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {note.title && <p className="truncate text-sm font-semibold text-white">{note.title}</p>}
            <NoteVisibilityBadge visibility={note.visibility} />
            {note.isPinned && <span className="rounded-full border border-[#00E6A3]/25 bg-[#00E6A3]/12 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7ef7cc]">Fijada</span>}
            {note.isArchived && <span className="badge">Archivada</span>}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/90">{note.content}</p>
          <p className="mt-2 text-xs text-muted">
            {note.author?.name || 'Autor desconocido'} · {formatNoteDate(note.createdAt)}
            {note.version && ` · ${note.version.name}`}
          </p>
        </div>
        {canManage && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={onTogglePin} aria-label={note.isPinned ? 'Desfijar' : 'Fijar'}>
              {note.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </button>
            <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={onToggleArchive} aria-label={note.isArchived ? 'Restaurar' : 'Archivar'}>
              {note.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            </button>
            <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={onEdit} aria-label="Editar nota"><Pencil className="h-4 w-4" /></button>
            <button type="button" className="btn-danger h-9 w-9 p-0" onClick={onDelete} aria-label="Eliminar nota"><Trash2 className="h-4 w-4" /></button>
          </div>
        )}
      </div>
    </article>
  );
}
