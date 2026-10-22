import { ChangeEvent, useMemo, useState } from 'react';
import { AlertTriangle, FileUp } from 'lucide-react';
import { CHORDPRO_MAX_LENGTH, parseChordPro } from '@harmonyhub/contracts';
import { OverlayDialog } from '../../../../shared/components/OverlayDialog';
import type { SongSummary } from '../../../../shared/types';
import type { SongContent } from '../../types/song-content.types';
import { SongPreview } from '../editor/SongPreview';
import { importChordPro } from '../../api/song-import.client';

export const CHORDPRO_FILE_ACCEPT = '.cho,.chordpro,.chopro,.crd,.pro,.txt';

type Target = 'new' | 'version';

/**
 * Importar ChordPro: archivo o texto pegado, vista previa con el mismo parser que usa la API, y se guarda como
 * cancion nueva o como version nueva de una cancion existente. Lo que no tiene lugar se muestra como aviso.
 */
export function ImportChordProDialog({
  songs,
  onClose,
  onImported,
}: {
  songs: SongSummary[];
  onClose: () => void;
  onImported: (songId: string) => void;
}) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('');
  const [target, setTarget] = useState<Target>('new');
  const [songId, setSongId] = useState('');
  const [versionName, setVersionName] = useState('Importada de ChordPro');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => (text.trim() ? parseChordPro(text) : null), [text]);
  const tooLarge = text.length > CHORDPRO_MAX_LENGTH;
  // Lo que se guarda: lo que se corrigio aqui o, si no, lo que traia el archivo.
  const finalTitle = title || parsed?.metadata.title || '';
  const finalArtist = artist || parsed?.metadata.artist || '';
  const finalKey = key || parsed?.metadata.key || '';
  const hasContent = Boolean(parsed?.content.sections.length);
  const canSave =
    hasContent && !tooLarge && !saving && (target === 'new' ? Boolean(finalTitle && finalArtist) : Boolean(songId && versionName.trim()));

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (file.size > CHORDPRO_MAX_LENGTH * 4) {
      setError('El archivo es demasiado grande para ser una canción en ChordPro.');
      return;
    }
    setFileName(file.name);
    setText(await file.text());
    setTitle('');
    setArtist('');
    setKey('');
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const result = await importChordPro(
        target === 'new'
          ? { text, title: title || null, artist: artist || null, key: key || null }
          : { text, songId, versionName: versionName.trim(), key: key || null },
      );
      onImported(result.song.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OverlayDialog title="Importar ChordPro" subtitle="Elige un archivo (.cho, .chordpro, .crd, .pro o .txt) o pega el texto. Revisa la vista previa antes de guardar." onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="btn-ghost cursor-pointer">
            <FileUp className="h-4 w-4" /> Elegir archivo
            <input type="file" accept={CHORDPRO_FILE_ACCEPT} className="sr-only" aria-label="Archivo ChordPro" onChange={(event) => void chooseFile(event)} />
          </label>
          {fileName && <span className="text-sm text-muted">{fileName}</span>}
        </div>
        <label className="block">
          <span className="label">Texto ChordPro</span>
          <textarea
            className="input min-h-[140px] font-mono text-sm"
            value={text}
            placeholder={'{title: Sublime gracia}\n{artist: John Newton}\n{key: G}\n\n{start_of_verse}\n[G]Sublime [C]gracia\n{end_of_verse}'}
            onChange={(event) => {
              setFileName('');
              setText(event.target.value);
            }}
          />
        </label>
        {tooLarge && <p className="text-sm text-[#F7A39A]">El texto es demasiado grande (máximo {CHORDPRO_MAX_LENGTH / 1000} mil caracteres).</p>}

        {parsed && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="label">Título</span>
                <input className="input" value={title} placeholder={parsed.metadata.title || 'Falta el título'} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label className="block">
                <span className="label">Artista</span>
                <input className="input" value={artist} placeholder={parsed.metadata.artist || 'Falta el artista'} onChange={(event) => setArtist(event.target.value)} />
              </label>
              <label className="block">
                <span className="label">Tonalidad</span>
                <input className="input" value={key} placeholder={parsed.metadata.key || 'C'} onChange={(event) => setKey(event.target.value)} />
              </label>
            </div>

            <fieldset className="space-y-2">
              <legend className="label">Guardar como</legend>
              <label className="flex items-center gap-2 text-sm text-white">
                <input type="radio" name="chordpro-target" checked={target === 'new'} onChange={() => setTarget('new')} /> Canción nueva
              </label>
              <label className="flex items-center gap-2 text-sm text-white">
                <input type="radio" name="chordpro-target" checked={target === 'version'} onChange={() => setTarget('version')} /> Versión nueva de una canción existente
              </label>
              {target === 'version' && (
                <div className="grid gap-3 pl-6 sm:grid-cols-2">
                  <select className="select" aria-label="Canción" value={songId} onChange={(event) => setSongId(event.target.value)}>
                    <option value="">Elige la canción…</option>
                    {songs.map((song) => (
                      <option key={song.id} value={song.id}>
                        {song.title} · {song.artist}
                      </option>
                    ))}
                  </select>
                  <input className="input" aria-label="Nombre de la versión" value={versionName} maxLength={80} onChange={(event) => setVersionName(event.target.value)} />
                </div>
              )}
            </fieldset>

            {parsed.warnings.length > 0 && (
              <ul className="space-y-1 rounded-xl border border-[#4A3B1E] bg-[#2A2414] p-3 text-sm text-[#F2C46E]" aria-label="Avisos del import">
                {parsed.warnings.map((warning) => (
                  <li key={warning} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {warning}
                  </li>
                ))}
              </ul>
            )}

            <section aria-label="Vista previa" className="max-h-[40vh] overflow-y-auto rounded-xl border border-[#30333A] bg-[#111214] p-4">
              <p className="mb-3 text-sm text-muted">
                Vista previa: {parsed.content.sections.length} {parsed.content.sections.length === 1 ? 'sección' : 'secciones'}
                {finalKey ? ` · Tonalidad ${finalKey}` : ''}
              </p>
              <SongPreview content={parsed.content as SongContent} showChords />
            </section>
          </>
        )}

        {error && <p className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-3 text-sm text-[#F7A39A]" role="alert">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" disabled={!canSave} onClick={() => void save()}>
            {saving ? 'Importando…' : target === 'new' ? 'Crear canción' : 'Crear versión'}
          </button>
        </div>
      </div>
    </OverlayDialog>
  );
}
