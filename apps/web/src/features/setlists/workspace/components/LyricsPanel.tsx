import { useMemo, useState } from 'react';
import type { SongVersion } from '../../../../shared/types';
import { SongPreview } from '../../../songs/components/editor/SongPreview';
import { SongContentSchema } from '../../../songs/schemas/song-content.schema';
import { legacyFieldsToSongContent, normalizeSongContent } from '../../../songs/utils/song-content.utils';

/** Letra/acordes en modo lectura. Usa SongPreview (sin efectos ni dialogos) en vez de SongEditor readOnly. */
export function LyricsPanel({ version }: { version: SongVersion }) {
  const [showChords, setShowChords] = useState(true);

  const content = useMemo(() => {
    const parsed = SongContentSchema.safeParse(version.contentJson);
    return parsed.success ? normalizeSongContent(parsed.data) : legacyFieldsToSongContent(version.lyrics, version.chords);
  }, [version]);

  return (
    <div className="space-y-4 p-4">
      <label className="flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" checked={showChords} onChange={(event) => setShowChords(event.target.checked)} />
        Mostrar acordes
      </label>
      <SongPreview content={content} showChords={showChords} />
    </div>
  );
}
