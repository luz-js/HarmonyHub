import type { SongContent } from '../../types/song-content.types';
import { normalizeSongContent } from '../../utils/song-content.utils';
import { transposeChordLine } from '../../domain/transposition';
import type { AccidentalPreference } from '../../domain/transposition';

export function TranspositionPreview({ content, semitones, preference, targetKey }: { content: SongContent; semitones: number; preference: AccidentalPreference; targetKey: string }) {
  const rows = normalizeSongContent(content).sections.flatMap((section) => section.lines.map((line) => ({
    section: section.name,
    before: line.chords,
    after: transposeChordLine(line.chords, semitones, preference, targetKey),
  }))).filter((line) => line.before.trim()).slice(0, 8);

  if (!rows.length) return <p className="rounded-md border border-white/10 p-4 text-sm text-muted">No hay acordes suficientes para previsualizar.</p>;

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={`${row.section}-${index}`} className="rounded-md border border-white/10 bg-[#141518] p-3">
          <p className="mb-2 text-xs font-bold uppercase text-muted">{row.section}</p>
          <div className="grid gap-2 md:grid-cols-2">
            <div><span className="text-xs text-muted">Antes</span><pre className="font-mono text-sm text-white">{row.before}</pre></div>
            <div><span className="text-xs text-muted">Después</span><pre className="font-mono text-sm text-primary">{row.after}</pre></div>
          </div>
        </div>
      ))}
    </div>
  );
}
