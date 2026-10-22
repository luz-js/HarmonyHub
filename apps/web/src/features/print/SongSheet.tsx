import type { SongContent } from '../songs/types/song-content.types';
import { normalizeSongContent } from '../songs/utils/song-content.utils';

export type SongSheetData = {
  title: string;
  artist?: string | null;
  keyLabel?: string | null;
  bpm?: number | null;
  timeSignature?: string | null;
  content: SongContent;
};

/** Hoja impresa de una cancion: datos arriba y cada seccion con sus acordes alineados sobre la letra. */
export function SongSheet({ song, showChords = true, breakBefore = false }: { song: SongSheetData; showChords?: boolean; breakBefore?: boolean }) {
  const content = normalizeSongContent(song.content);
  const details = [song.keyLabel && `Tonalidad: ${song.keyLabel}`, song.bpm && `${song.bpm} BPM`, song.timeSignature].filter(Boolean).join(' · ');
  return (
    <article className={`print-song${breakBefore ? ' print-break' : ''}`}>
      <header className="print-song-header">
        <h1>{song.title}</h1>
        {song.artist && <p className="print-artist">{song.artist}</p>}
        {details && <p className="print-details">{details}</p>}
      </header>
      {content.sections.map((section) => (
        <section key={section.id} className="print-section">
          <h2>{section.name}</h2>
          {section.notes && <p className="print-notes">{section.notes}</p>}
          {section.lines.map((line) => (
            <div key={line.id} className="print-line">
              {showChords && line.chords.trim() && <pre className="print-chords">{line.chords}</pre>}
              {line.lyrics && <pre className="print-lyrics">{line.lyrics}</pre>}
            </div>
          ))}
        </section>
      ))}
    </article>
  );
}
