import { useMemo, useState } from 'react';
import type { SongVersion } from '../../../../shared/types';
import type { SongContent } from '../../types/song-content.types';
import { contentToPlainChords, contentToPlainLyrics, deriveStructureJson, normalizeSongContent } from '../../utils/song-content.utils';
import {
  describeInterval,
  getSemitoneDistance,
  parseKeySignature,
  transposeSongContent,
  validateTranspositionIntegrity,
  type AccidentalPreference,
} from '../../domain/transposition';
import { useCreateTransposedSongVersion, useTransposeSongVersion } from '../../hooks';
import { getCurrentOrganizationId } from '../../../../shared/api/http';
import { AccidentalPreferenceSelector } from './AccidentalPreferenceSelector';
import { KeySelector } from './KeySelector';
import { SaveAsVersionDialog } from './SaveAsVersionDialog';
import { TranspositionPreview } from './TranspositionPreview';

export function TransposeDialog({
  open,
  onClose,
  songId,
  version,
  content,
  versions = [],
  readOnly,
  onTemporary,
  onResetTemporary,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  songId: string;
  version: SongVersion;
  content: SongContent;
  versions?: SongVersion[];
  readOnly?: boolean;
  onTemporary: (key: string, content: SongContent) => void;
  onResetTemporary: () => void;
  onSaved?: () => void;
}) {
  const organizationId = getCurrentOrganizationId() || '';
  const [targetKey, setTargetKey] = useState(version.key || 'C');
  const [preference, setPreference] = useState<AccidentalPreference>('AUTO');
  const [newVersionName, setNewVersionName] = useState(`En ${version.key || 'C'}`);
  const [message, setMessage] = useState('');
  const transposeMutation = useTransposeSongVersion(organizationId, songId);
  const createMutation = useCreateTransposedSongVersion(organizationId, songId);

  const semitones = useMemo(() => getSemitoneDistance(version.key || 'C', targetKey), [version.key, targetKey]);
  const transposed = useMemo(() => transposeSongContent(normalizeSongContent(content), { semitones, accidentalPreference: preference, targetKey }), [content, semitones, preference, targetKey]);
  const integrity = useMemo(() => validateTranspositionIntegrity(content, transposed), [content, transposed]);

  if (!open) return null;

  async function applyCurrent() {
    if (readOnly) return setMessage('No tienes permisos para modificar esta versión.');
    if (!parseKeySignature(targetKey)) return setMessage('No se pudo interpretar la tonalidad destino.');
    if (!integrity.valid) return setMessage(integrity.errors[0] || 'La transposición no pasó la verificación de integridad.');
    if (!window.confirm('Esta acción cambiará permanentemente la tonalidad y los acordes de esta versión.')) return;
    await transposeMutation.mutateAsync({ versionId: version.id, key: targetKey, content: transposed });
    setMessage(`Versión transpuesta correctamente de ${version.key} a ${targetKey}.`);
    onSaved?.();
  }

  async function saveAsVersion() {
    if (readOnly) return setMessage('No tienes permisos para crear versiones.');
    const name = newVersionName.trim();
    if (!name) return setMessage('Escribe un nombre para la nueva versión.');
    if (versions.some((item) => item.name.toLowerCase() === name.toLowerCase())) return setMessage('Ya existe una version con ese nombre.');
    if (!integrity.valid) return setMessage(integrity.errors[0] || 'La transposición no pasó la verificación de integridad.');
    await createMutation.mutateAsync({ source: version, name, key: targetKey, content: transposed });
    setMessage(`Nueva versión "${name}" creada correctamente.`);
    onSaved?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <section className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-lg border border-[#30333A] bg-[#1A1B1F] p-5 shadow-soft">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Transponer</h2>
            <p className="mt-1 text-sm text-muted">Tonalidad actual: {version.key || 'C'} · Destino: {targetKey} · {describeInterval(semitones)}</p>
          </div>
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <KeySelector value={targetKey} preference={preference} onChange={(value) => {
              setTargetKey(value);
              setNewVersionName(`En ${value}`);
            }} />
            <AccidentalPreferenceSelector value={preference} onChange={setPreference} />
            <SaveAsVersionDialog name={newVersionName} onNameChange={setNewVersionName} targetKey={targetKey} />
            <div className="space-y-2 rounded-md border border-white/10 bg-[#141518] p-3">
              <button className="btn-primary w-full" onClick={() => {
                onTemporary(targetKey, transposed);
                setMessage('Vista temporal aplicada. La versión original no fue modificada.');
              }}>Ver temporalmente</button>
              <button className="btn-ghost w-full" onClick={() => {
                onResetTemporary();
                setMessage('Vista temporal removida.');
              }}>Volver a tonalidad original</button>
              {!readOnly && <button className="btn-ghost w-full" onClick={applyCurrent} disabled={transposeMutation.isPending}>Aplicar a esta versión</button>}
              {!readOnly && <button className="btn-ghost w-full" onClick={saveAsVersion} disabled={createMutation.isPending}>Guardar como nueva versión</button>}
            </div>
            {message && <p className="rounded-md border border-white/10 bg-[#141518] p-3 text-sm text-muted" aria-live="polite">{message}</p>}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase text-muted">Vista previa</h3>
            <TranspositionPreview content={content} semitones={semitones} preference={preference} targetKey={targetKey} />
            <div className="mt-4 hidden">
              {contentToPlainLyrics(transposed)} {contentToPlainChords(transposed)} {JSON.stringify(deriveStructureJson(transposed))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
