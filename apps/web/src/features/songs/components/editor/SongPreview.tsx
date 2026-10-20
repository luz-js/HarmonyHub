import type { SongContent } from '../../types/song-content.types';
import { normalizeSongContent } from '../../utils';
import { SectionTypeBadge } from './SectionTypeBadge';

export function SongPreview({ content, showChords, fontSize = 16 }: { content: SongContent; showChords: boolean; fontSize?: number }) {
  const normalized = normalizeSongContent(content);

  if (!normalized.sections.length) {
    return <div className="rounded-md border border-dashed border-white/10 p-5 text-sm text-muted">Esta versión todavía no tiene una estructura.</div>;
  }

  return (
    <div className="space-y-6" style={{ fontSize }}>
      {normalized.sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <SectionTypeBadge type={section.type} />
            <h3 className="font-bold text-white">{section.name}</h3>
          </div>
          {section.lines.length === 0 && section.chords?.length ? <pre className="font-mono text-primary">{section.chords.join('   ')}</pre> : null}
          {section.lines.map((line) => (
            <div key={line.id} className="font-mono">
              {showChords && line.chords && <pre className="whitespace-pre-wrap text-primary">{line.chords}</pre>}
              <pre className="whitespace-pre-wrap font-sans text-white">{line.lyrics || ' '}</pre>
            </div>
          ))}
          {section.notes && <p className="text-xs text-muted">{section.notes}</p>}
        </section>
      ))}
    </div>
  );
}
