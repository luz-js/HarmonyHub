import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { useCreateSongThread, useSongThreads } from '../../hooks';
import { getCurrentOrganizationId } from '../../../../shared/api/http';
import { OverlayDialog } from '../shared/OverlayDialog';
import { CreateThreadDialog } from './CreateThreadDialog';
import { ThreadCard } from './ThreadCard';
import { ThreadDetail } from './ThreadDetail';

/**
 * Accion discreta "Comentar seccion" para SongSectionHeader. Vive en el
 * modulo de colaboracion (no en editor/) para no duplicar los componentes de
 * thread/comentarios; el editor solo importa este disparador.
 */
export function SectionCommentTrigger({ songId, versionId, sectionId, sectionName }: { songId: string; versionId: string; sectionId: string; sectionName: string }) {
  const organizationId = getCurrentOrganizationId() || '';
  const threadsQuery = useSongThreads(organizationId, songId, { versionId, targetType: 'SECTION', targetRef: sectionId });
  const createThread = useCreateSongThread(organizationId, songId);

  const [showList, setShowList] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);

  const threads = threadsQuery.data || [];
  const openCount = threads.filter((thread) => thread.status === 'OPEN').length;

  async function handleCreate(payload: { targetRef: string | null; title: string; content: string; mentionedUserIds: string[] }) {
    setCreateError('');
    try {
      const created = await createThread.mutateAsync({
        targetType: 'SECTION',
        versionId,
        targetRef: sectionId,
        title: payload.title || undefined,
        content: payload.content,
        mentionedUserIds: payload.mentionedUserIds,
      });
      setShowCreate(false);
      setShowList(false);
      setOpenThreadId(created.id);
    } catch (error: any) {
      setCreateError(error?.message || 'No se pudo crear la conversación');
    }
  }

  return (
    <>
      <button type="button" className="icon-button relative" aria-label="Comentar sección" title="Comentar sección" onClick={() => setShowList(true)}>
        <MessageSquarePlus className="h-4 w-4" />
        {threads.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">
            {threads.length}
          </span>
        )}
      </button>

      {showList && (
        <OverlayDialog title={`Comentarios · ${sectionName}`} subtitle={openCount > 0 ? `${openCount} conversación(es) pendiente(s)` : undefined} onClose={() => setShowList(false)}>
          <div className="space-y-3">
            {threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} sectionName={sectionName} onOpen={() => setOpenThreadId(thread.id)} />
            ))}
            {threads.length === 0 && <p className="text-sm text-muted">Todavía no hay comentarios en esta sección.</p>}
            <div className="flex justify-end">
              <button className="btn-primary" onClick={() => setShowCreate(true)}>Nueva conversación sobre esta sección</button>
            </div>
          </div>
        </OverlayDialog>
      )}

      {showCreate && (
        <CreateThreadDialog
          versions={[]}
          fixedTarget={{ targetType: 'SECTION', versionId, targetRef: sectionId, contextLabel: `Sección: ${sectionName}` }}
          submitting={createThread.isPending}
          error={createError}
          onSubmit={(payload) => void handleCreate(payload)}
          onClose={() => {
            setCreateError('');
            setShowCreate(false);
          }}
        />
      )}

      {openThreadId && (
        <ThreadDetail
          organizationId={organizationId}
          songId={songId}
          threadId={openThreadId}
          sectionName={sectionName}
          onClose={() => setOpenThreadId(null)}
        />
      )}
    </>
  );
}
