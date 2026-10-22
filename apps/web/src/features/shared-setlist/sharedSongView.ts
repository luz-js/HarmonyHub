import type { SharedSetlistItem } from '../../shared/types';
import { formatKey, getSemitoneDistance, parseKeySignature, transposeSongContent } from '../songs/domain/transposition';
import { FLAT_KEYS, NOTE_TO_INDEX, SHARP_NOTES } from '../songs/domain/transposition/chord.constants';
import type { SongContent } from '../songs/types/song-content.types';
import { normalizeSongContent } from '../songs/utils/song-content.utils';

/** "D" subido 2 semitonos -> "E"; "Em" bajado 1 -> "Ebm" (con bemoles si es una tonalidad de bemoles: Eb, no D#). */
export function shiftKey(key: string, semitones: number) {
  const parsed = parseKeySignature(key);
  if (!parsed) return key;
  const index = (((NOTE_TO_INDEX[parsed.root] + semitones) % 12) + 12) % 12;
  const flatKey = formatKey(SHARP_NOTES[index], parsed.mode, 'FLATS');
  return FLAT_KEYS.has(flatKey) ? flatKey : formatKey(SHARP_NOTES[index], parsed.mode, 'SHARPS');
}

/**
 * Lo que muestra la pagina publica de una cancion: la letra con acordes en la tonalidad del setlist (si la version
 * esta escrita en otra, se transporta) y, ademas, lo que la persona suba o baje en su navegador (`shift`).
 */
export function sharedSongView(item: Pick<SharedSetlistItem, 'key' | 'originalKey' | 'content'>, shift = 0): { keyLabel: string | null; content: SongContent | null } {
  const baseKey = item.key ?? item.originalKey;
  const keyLabel = baseKey ? shiftKey(baseKey, shift) : null;
  if (!item.content) return { keyLabel, content: null };
  const content = normalizeSongContent(item.content);
  const fromSetlist = item.originalKey && item.key ? getSemitoneDistance(item.originalKey, item.key) : 0;
  const semitones = fromSetlist + shift;
  if (!semitones) return { keyLabel, content };
  return { keyLabel, content: transposeSongContent(content, { semitones, accidentalPreference: 'AUTO', targetKey: keyLabel ?? undefined }) };
}
