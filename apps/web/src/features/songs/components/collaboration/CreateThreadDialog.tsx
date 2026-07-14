import { FormEvent, useState } from 'react';
import { LoaderCircle, MessagesSquare } from 'lucide-react';
import type { SongCommentTarget, SongVersion } from '../../../../shared/types';
import { OverlayDialog } from '../shared/OverlayDialog';
import { MentionPicker } from './MentionPicker';

export type FixedThreadTarget = {
  targetType: 'SECTION';
  versionId: string;
  targetRef: string;
  contextLabel: string;
};

const MAX_COMMENT_LENGTH = 5000;

export function CreateThreadDialog({
  versions,
  activeVersionId,
  fixedTarget,
  submitting,
  error,
  onSubmit,
  onClose,
}: {
  versions: SongVersion[];
  activeVersionId?: string | null;
  fixedTarget?: FixedThreadTarget;
  submitting: boolean;
  error: string;
  onSubmit: (payload: { targetType: SongCommentTarget; versionId: string; targetRef: string | null; title: string; content: string; mentionedUserIds: string[] }) => void;
  onClose: () => void;
}) {
  const [targetType, setTargetType] = useState<SongCommentTarget>(fixedTarget?.targetType || (activeVersionId ? 'VERSION' : 'SONG'));
  const [versionId, setVersionId] = useState(fixedTarget?.versionId || activeVersionId || '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    onSubmit({
      targetType,
      versionId: fixedTarget ? fixedTarget.versionId : (targetType === 'VERSION' ? versionId : ''),
      targetRef: fixedTarget?.targetRef || null,
      title,
      content,
      mentionedUserIds,
    });
  }

  return (
    <OverlayDialog title="Nueva conversación" subtitle={fixedTarget?.contextLabel || 'Inicia una conversación sobre esta canción o una versión.'} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {!fixedTarget && (
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="label">Contexto</span>
              <select className="select" value={targetType} onChange={(event) => setTargetType(event.target.value as SongCommentTarget)}>
                <option value="SONG">Canción completa</option>
                <option value="VERSION">Una versión</option>
              </select>
            </label>
            {targetType === 'VERSION' && (
              <label>
                <span className="label">Versión</span>
                <select className="select" value={versionId} onChange={(event) => setVersionId(event.target.value)} required>
                  <option value="">Selecciona una versión</option>
                  {versions.map((version) => <option key={version.id} value={version.id}>{version.name}</option>)}
                </select>
              </label>
            )}
          </div>
        )}
        <label>
          <span className="label">Título (opcional)</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} />
        </label>
        <label>
          <span className="label">Primer comentario</span>
          <textarea className="textarea min-h-[100px]" value={content} onChange={(event) => setContent(event.target.value.slice(0, MAX_COMMENT_LENGTH))} required />
        </label>
        <MentionPicker selectedUserIds={mentionedUserIds} onChange={setMentionedUserIds} />
        {error && <p className="text-sm text-red-200">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={submitting}>
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MessagesSquare className="h-4 w-4" />}
            {submitting ? 'Creando...' : 'Crear conversación'}
          </button>
        </div>
      </form>
    </OverlayDialog>
  );
}
