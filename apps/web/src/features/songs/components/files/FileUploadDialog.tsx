import { ChangeEvent, FormEvent, useState } from 'react';
import { LoaderCircle, Upload } from 'lucide-react';
import type { SongVersion } from '../../../../shared/types';
import { OverlayDialog } from '../shared/OverlayDialog';
import { FileMetadataFields, defaultSongFileDraft, SongFileDraft } from './FileMetadataFields';
import { formatBytes, inferCategoryFromFile } from './file.utils';

export function FileUploadDialog({
  versions,
  activeVersionId,
  submitting,
  progress,
  error,
  onSubmit,
  onClose,
}: {
  versions: SongVersion[];
  activeVersionId?: string | null;
  submitting: boolean;
  progress: number | null;
  error: string;
  onSubmit: (payload: { file: File; draft: SongFileDraft }) => void;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<SongFileDraft>(defaultSongFileDraft(activeVersionId));

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    if (!nextFile) return;
    setDraft((current) => ({
      ...current,
      title: current.title || nextFile.name.replace(/\.[^.]+$/, ''),
      category: inferCategoryFromFile(nextFile),
    }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    onSubmit({ file, draft });
  }

  return (
    <OverlayDialog
      title="Subir archivo"
      subtitle="PDF, imágenes, documentos, presentaciones, MIDI o MusicXML · Máximo 25 MB"
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        <label className="block rounded-2xl border border-dashed border-[#30333A] bg-[#0C0D0F] p-4 text-sm text-muted">
          <span className="mb-2 block text-white">Archivo</span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt,.md,.doc,.docx,.odt,.ppt,.pptx,.mid,.midi,.musicxml,.xml"
            onChange={handleFileChange}
          />
          {file && <p className="mt-2 text-xs text-muted">{file.name} · {formatBytes(file.size)}</p>}
        </label>
        <FileMetadataFields draft={draft} versions={versions} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} />
        {progress !== null && (
          <div className="rounded-xl border border-[#30333A] bg-[#1C2436] p-3 text-sm text-muted">
            <div className="flex items-center justify-between gap-3">
              <span>Subiendo...</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[#23252A]">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        {error && <p className="text-sm text-[#F7A39A]">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={submitting || !file}>
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {submitting ? 'Subiendo...' : 'Subir archivo'}
          </button>
        </div>
      </form>
    </OverlayDialog>
  );
}
