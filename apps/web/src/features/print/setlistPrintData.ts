import type { SetlistDetail, SetlistItem } from '../../shared/types';
import { getSongVersion } from '../../shared/api/api-client';
import { getSemitoneDistance, transposeSongContent } from '../songs/domain/transposition';
import type { SongContent } from '../songs/types/song-content.types';
import { legacyFieldsToSongContent, normalizeSongContent } from '../songs/utils/song-content.utils';
import type { SongSheetData } from './SongSheet';

export type SetlistPrintData = { songs: Array<{ itemId: string; sheet: SongSheetData }> };

/** Los items que se ven (los ocultos no salen en el PDF), en orden. */
export function printableItems(setlist: SetlistDetail) {
  return [...setlist.items].filter((item) => !item.isHidden).sort((a, b) => a.order - b.order);
}

/**
 * Trae la letra y acordes de cada cancion del setlist, en la tonalidad que el setlist usa para ese item
 * (si el item cambia la tonalidad, se transporta igual que en la vista del setlist).
 */
export async function loadSetlistPrintData(setlist: SetlistDetail, fetchVersion = getSongVersion): Promise<SetlistPrintData> {
  const songs = printableItems(setlist).filter((item): item is SetlistItem & { songId: string; songVersionId: string } => item.type === 'SONG' && Boolean(item.songId && item.songVersionId));
  const sheets = await Promise.all(
    songs.map(async (item) => {
      const version = await fetchVersion(item.songId, item.songVersionId);
      let content: SongContent = normalizeSongContent(version.contentJson || legacyFieldsToSongContent(version.lyrics, version.chords));
      const targetKey = item.effective.key || version.key;
      const semitones = version.key && targetKey && targetKey !== version.key ? getSemitoneDistance(version.key, targetKey) : 0;
      if (semitones) content = transposeSongContent(content, { semitones, accidentalPreference: 'AUTO', targetKey });
      const sheet: SongSheetData = {
        title: item.title,
        artist: item.song?.artist,
        keyLabel: targetKey,
        bpm: item.effective.bpm,
        content,
      };
      return { itemId: item.id, sheet };
    }),
  );
  return { songs: sheets };
}
