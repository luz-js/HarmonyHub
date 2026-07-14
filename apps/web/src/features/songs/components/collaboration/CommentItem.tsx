import { FormEvent, useState } from 'react';
import { LoaderCircle, Pencil, Trash2 } from 'lucide-react';
import type { SongComment } from '../../../../shared/types';
import { formatThreadDate } from './collaboration.utils';

export function CommentItem({
  comment,
  canEdit,
  canDelete,
  saving,
  onEdit,
  onDelete,
}: {
  comment: SongComment;
  canEdit: boolean;
  canDelete: boolean;
  saving: boolean;
  onEdit: (content: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content || '');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    onEdit(draft);
    setEditing(false);
  }

  if (comment.isDeleted) {
    return (
      <div className="rounded-xl border border-dashed border-[#1b2c40] bg-[#08131d] p-3 text-sm italic text-muted">
        Comentario eliminado
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1b2c40] bg-[#091522] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{comment.author?.name || 'Usuario'}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{formatThreadDate(comment.createdAt)}{comment.editedAt ? ' · editado' : ''}</span>
          {canEdit && !editing && <button type="button" className="btn-ghost h-7 w-7 p-0" onClick={() => setEditing(true)} aria-label="Editar comentario"><Pencil className="h-3.5 w-3.5" /></button>}
          {canDelete && <button type="button" className="btn-danger h-7 w-7 p-0" onClick={onDelete} aria-label="Eliminar comentario"><Trash2 className="h-3.5 w-3.5" /></button>}
        </div>
      </div>
      {editing ? (
        <form className="mt-2 space-y-2" onSubmit={submit}>
          <textarea className="textarea min-h-[70px]" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={() => { setDraft(comment.content || ''); setEditing(false); }}>Cancelar</button>
            <button className="btn-primary h-8 px-3 text-xs" disabled={saving}>
              {saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null} Guardar
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/90">{comment.content}</p>
      )}
    </div>
  );
}
