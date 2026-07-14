import { useMemo, useState } from 'react';
import { MessagesSquare, Plus } from 'lucide-react';
import { useCreateSongThread, useSongThreads } from '../../hooks';
import type { SongThreadStatus, SongVersion } from '../../../../shared/types';
import { getCurrentOrganizationId } from '../../../../shared/api/http';
import { CreateThreadDialog } from './CreateThreadDialog';
import { ThreadCard } from './ThreadCard';
import { ThreadDetail } from './ThreadDetail';

export function SongCollaborationPanel({
  songId,
  versions,
  activeVersionId,
  onChanged,
}: {
  songId: string;
  versions: SongVersion[];
  activeVersionId: string | null;
  onChanged?: () => void;
}) {
  const organizationId = getCurrentOrganizationId() || '';
  const threadsQuery = useSongThreads(organizationId, songId);
  const createThread = useCreateSongThread(organizationId, songId);

  const [statusFilter, setStatusFilter] = useState<SongThreadStatus | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createError, setCreateError] = useState('');
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);

  const threads = useMemo(() => threadsQuery.data || [], [threadsQuery.data]);
  const openThreads = useMemo(() => threads.filter((thread) => thread.status === 'OPEN'), [threads]);
  const resolvedThreads = useMemo(() => threads.filter((thread) => thread.status === 'RESOLVED'), [threads]);

  function notifyChange() {
    onChanged?.();
  }

  async function handleCreate(payload: { targetType: any; versionId: string; targetRef: string | null; title: string; content: string; mentionedUserIds: string[] }) {
    setCreateError('');
    try {
      const created = await createThread.mutateAsync({
        targetType: payload.targetType,
        versionId: payload.versionId || null,
        targetRef: payload.targetRef,
        title: payload.title || undefined,
        content: payload.content,
        mentionedUserIds: payload.mentionedUserIds,
      });
      notifyChange();
      setShowCreateDialog(false);
      setOpenThreadId(created.id);
    } catch (error: any) {
      setCreateError(error?.message || 'No se pudo crear la conversación');
    }
  }

  const loading = threadsQuery.isLoading;
  const error = threadsQuery.error instanceof Error ? threadsQuery.error.message : '';
  const visibleThreads = statusFilter === 'all' ? threads : statusFilter === 'OPEN' ? openThreads : resolvedThreads;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#1b2c40] bg-[#07131d] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00D4C8]">Colaboración</p>
            <h2 className="mt-2 text-xl font-bold text-white">Conversaciones del equipo</h2>
            <p className="mt-1 text-sm text-muted">Discute decisiones sobre la canción, una versión o una sección específica.</p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4" /> Nueva conversación</button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className={statusFilter === 'all' ? 'btn-primary' : 'btn-ghost'} onClick={() => setStatusFilter('all')}>Todas</button>
          <button className={statusFilter === 'OPEN' ? 'btn-primary' : 'btn-ghost'} onClick={() => setStatusFilter('OPEN')}>Abiertas</button>
          <button className={statusFilter === 'RESOLVED' ? 'btn-primary' : 'btn-ghost'} onClick={() => setStatusFilter('RESOLVED')}>Resueltas</button>
        </div>
      </section>

      {loading && <section className="panel p-5 text-muted">Cargando conversaciones...</section>}
      {error && <section className="rounded-md border border-[#ff5c77]/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</section>}

      {!loading && !error && visibleThreads.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#1b2c40] bg-[#08131d] px-6 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#173347] bg-[#0b1b24] text-[#00E6A3]">
            <MessagesSquare className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-white">Todavía no hay conversaciones.</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">Inicia una conversación sobre la canción, una versión o comenta una sección desde el editor.</p>
          <div className="mt-5 flex justify-center">
            <button className="btn-primary" onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4" /> Nueva conversación</button>
          </div>
        </div>
      )}

      {!loading && !error && visibleThreads.length > 0 && (
        <div className="space-y-3">
          {visibleThreads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} onOpen={() => setOpenThreadId(thread.id)} />
          ))}
        </div>
      )}

      {showCreateDialog && (
        <CreateThreadDialog
          versions={versions}
          activeVersionId={activeVersionId}
          submitting={createThread.isPending}
          error={createError}
          onSubmit={(payload) => void handleCreate(payload)}
          onClose={() => {
            setCreateError('');
            setShowCreateDialog(false);
          }}
        />
      )}

      {openThreadId && (
        <ThreadDetail
          organizationId={organizationId}
          songId={songId}
          threadId={openThreadId}
          onClose={() => setOpenThreadId(null)}
          onChanged={notifyChange}
        />
      )}
    </div>
  );
}
