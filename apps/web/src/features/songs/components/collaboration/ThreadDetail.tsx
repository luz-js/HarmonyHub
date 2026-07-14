import { CheckCircle2, LoaderCircle, RotateCcw } from 'lucide-react';
import {
  useCreateSongComment,
  useDeleteSongComment,
  useReopenSongThread,
  useResolveSongThread,
  useSongThread,
  useUpdateSongComment,
} from '../../hooks';
import { OverlayDialog } from '../shared/OverlayDialog';
import { getCurrentUser } from '../notes/note.utils';
import { CommentComposer } from './CommentComposer';
import { CommentItem } from './CommentItem';
import { threadContextLabel } from './collaboration.utils';

export function ThreadDetail({
  organizationId,
  songId,
  threadId,
  sectionName,
  onClose,
  onChanged,
}: {
  organizationId: string;
  songId: string;
  threadId: string;
  sectionName?: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const currentUser = getCurrentUser();
  const threadQuery = useSongThread(organizationId, songId, threadId);
  const createComment = useCreateSongComment(organizationId, songId);
  const updateComment = useUpdateSongComment(organizationId, songId);
  const deleteComment = useDeleteSongComment(organizationId, songId);
  const resolveThread = useResolveSongThread(organizationId, songId);
  const reopenThread = useReopenSongThread(organizationId, songId);

  const thread = threadQuery.data;
  const canModerate = currentUser.role === 'OWNER' || currentUser.role === 'ADMIN';
  const canResolve = canModerate || currentUser.role === 'LEADER' || thread?.createdBy?.id === currentUser.id;

  return (
    <OverlayDialog
      title={thread?.title || 'Conversación'}
      subtitle={thread ? threadContextLabel(thread, sectionName) : undefined}
      onClose={onClose}
    >
      {threadQuery.isLoading && <div className="flex justify-center py-8"><LoaderCircle className="h-6 w-6 animate-spin text-muted" /></div>}
      {threadQuery.error && <p className="text-sm text-red-200">No se pudo cargar la conversación.</p>}

      {thread && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={`badge ${thread.status === 'OPEN' ? 'badge-primary' : ''}`}>{thread.status === 'OPEN' ? 'Pendiente de revisión' : 'Resuelto'}</span>
            {canResolve && (
              thread.status === 'OPEN' ? (
                <button type="button" className="btn-ghost h-9 px-3" onClick={() => void resolveThread.mutateAsync(threadId).then(onChanged)} disabled={resolveThread.isPending}>
                  <CheckCircle2 className="h-4 w-4" /> Marcar como resuelto
                </button>
              ) : (
                <button type="button" className="btn-ghost h-9 px-3" onClick={() => void reopenThread.mutateAsync(threadId).then(onChanged)} disabled={reopenThread.isPending}>
                  <RotateCcw className="h-4 w-4" /> Reabrir conversación
                </button>
              )
            )}
          </div>

          <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
            {(thread.comments || []).map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                canEdit={comment.author?.id === currentUser.id}
                canDelete={comment.author?.id === currentUser.id || canModerate}
                saving={updateComment.isPending || deleteComment.isPending}
                onEdit={(content) => void updateComment.mutateAsync({ threadId, commentId: comment.id, input: { content } }).then(onChanged)}
                onDelete={() => void deleteComment.mutateAsync({ threadId, commentId: comment.id }).then(onChanged)}
              />
            ))}
            {(thread.comments || []).length === 0 && <p className="text-sm text-muted">Todavía no hay comentarios.</p>}
          </div>

          <CommentComposer
            submitting={createComment.isPending}
            submitLabel="Comentar"
            onSubmit={(payload) => void createComment.mutateAsync({ threadId, input: payload }).then(onChanged)}
          />
        </div>
      )}
    </OverlayDialog>
  );
}
