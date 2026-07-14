import type { SongFileCategory, SongVersion } from '../../../../shared/types';
import { SELECTABLE_FILE_CATEGORIES, fileCategoryLabels } from './file.utils';

export type SongFileDraft = {
  title: string;
  description: string;
  category: SongFileCategory;
  versionId: string;
  isPrimary: boolean;
};

export function defaultSongFileDraft(activeVersionId?: string | null): SongFileDraft {
  return { title: '', description: '', category: 'OTHER', versionId: activeVersionId || '', isPrimary: false };
}

export function FileMetadataFields({
  draft,
  versions,
  onChange,
}: {
  draft: SongFileDraft;
  versions: SongVersion[];
  onChange: (patch: Partial<SongFileDraft>) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="md:col-span-2">
        <span className="label">Título</span>
        <input className="input" value={draft.title} onChange={(event) => onChange({ title: event.target.value })} maxLength={160} required />
      </label>
      <label>
        <span className="label">Categoría</span>
        <select className="select" value={draft.category} onChange={(event) => onChange({ category: event.target.value as SongFileCategory })}>
          {SELECTABLE_FILE_CATEGORIES.map((category) => <option key={category} value={category}>{fileCategoryLabels[category]}</option>)}
        </select>
      </label>
      <label>
        <span className="label">Versión asociada</span>
        <select className="select" value={draft.versionId} onChange={(event) => onChange({ versionId: event.target.value })}>
          <option value="">General de la canción</option>
          {versions.map((version) => <option key={version.id} value={version.id}>{version.name}</option>)}
        </select>
      </label>
      <label className="md:col-span-2">
        <span className="label">Descripción (opcional)</span>
        <textarea className="textarea" value={draft.description} onChange={(event) => onChange({ description: event.target.value })} maxLength={2000} />
      </label>
      <label className="flex items-center gap-2 text-sm text-muted md:col-span-2">
        <input type="checkbox" checked={draft.isPrimary} onChange={(event) => onChange({ isPrimary: event.target.checked })} />
        Marcar como principal de esta categoría en este contexto
      </label>
    </div>
  );
}
