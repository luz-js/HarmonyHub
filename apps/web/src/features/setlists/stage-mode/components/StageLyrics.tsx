import type { SetlistItem } from '../../../../shared/types';
import { useSongVersion } from '../../../songs/hooks/useSongVersion';
import { SongPreview } from '../../../songs/components/editor/SongPreview';
import { SongContentSchema } from '../../../songs/schemas/song-content.schema';
import { legacyFieldsToSongContent, normalizeSongContent } from '../../../songs/utils/song-content.utils';

export function StageLyrics({
  organizationId,
  item,
  showChords,
  fontSize,
}: {
  organizationId: string;
  item: SetlistItem;
  showChords: boolean;
  fontSize: number;
}) {
  const versionQuery = useSongVersion(organizationId, item.songId ?? '', item.songVersionId ?? '');
  const version = versionQuery.data;

  if (versionQuery.isLoading) return <p className="text-center text-muted">Cargando letra...</p>;
  if (!version) return <p className="text-center text-muted">Sin letra disponible para esta canción.</p>;

  const parsed = SongContentSchema.safeParse(version.contentJson);
  const content = parsed.success ? normalizeSongContent(parsed.data) : legacyFieldsToSongContent(version.lyrics, version.chords);

  return (
    <div className="mx-auto max-w-3xl overflow-y-auto">
      <SongPreview content={content} showChords={showChords} fontSize={fontSize} />
    </div>
  );
}
