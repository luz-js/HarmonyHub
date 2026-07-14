import { MessageCircle } from 'lucide-react';
import type { SongCommentThread } from '../../../../shared/types';
import { formatThreadDate, threadContextLabel } from './collaboration.utils';

export function ThreadCard({ thread, sectionName, onOpen }: { thread: SongCommentThread; sectionName?: string; onOpen: () => void }) {
  return (
    <article className="rounded-2xl border border-[#1b2c40] bg-[#091522] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">{threadContextLabel(thread, sectionName)}</span>
            <span className={`badge ${thread.status === 'OPEN' ? 'badge-primary' : ''}`}>{thread.status === 'OPEN' ? 'Pendiente de revisión' : 'Resuelto'}</span>
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-white">{thread.title || 'Conversación'}</p>
          {thread.lastComment && (
            <p className="mt-1 truncate text-xs text-muted">
              {thread.lastComment.isDeleted ? 'Comentario eliminado' : `${thread.lastComment.author?.name || 'Alguien'}: ${thread.lastComment.content}`}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">{thread.createdBy?.name || 'Alguien'} · {formatThreadDate(thread.createdAt)}</p>
        </div>
        <button type="button" className="btn-ghost h-9 px-3" onClick={onOpen}>
          <MessageCircle className="h-4 w-4" /> {thread.commentsCount} {thread.commentsCount === 1 ? 'comentario' : 'comentarios'}
        </button>
      </div>
    </article>
  );
}
