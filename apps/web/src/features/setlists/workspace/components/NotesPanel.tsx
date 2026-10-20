import { useMemo } from 'react';
import { SongNoteCard } from '../../../songs/components/notes/SongNoteCard';
import { useSongNotes } from '../../../songs/hooks/useSongNotes';

const noop = () => {};

/**
 * Notas de solo lectura, acotadas a la version del SetlistItem + generales.
 * No reusa SongNotesPanel (ese trae todas las versiones sin filtro).
 */
export function NotesPanel({ organizationId, songId, versionId }: { organizationId: string; songId: string; versionId: string | null }) {
  const notesQuery = useSongNotes(organizationId, songId, { versionId: versionId ?? undefined });
  const notes = useMemo(() => notesQuery.data || [], [notesQuery.data]);

  const versionNotes = useMemo(() => notes.filter((note) => note.versionId === versionId), [notes, versionId]);
  const generalNotes = useMemo(() => notes.filter((note) => note.versionId === null), [notes]);

  if (notesQuery.isLoading) return <p className="p-4 text-sm text-muted">Cargando notas...</p>;
  if (notesQuery.error) return <p className="p-4 text-sm text-[#F7A39A]">No se pudieron cargar las notas.</p>;
  if (notes.length === 0) return <p className="p-4 text-sm text-muted">Esta canción no tiene notas todavía.</p>;

  return (
    <div className="space-y-5 p-4">
      {versionNotes.length > 0 && (
        <section>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-faint">Notas de esta versión</h4>
          <div className="space-y-3">
            {versionNotes.map((note) => (
              <SongNoteCard key={note.id} note={note} canManage={false} onEdit={noop} onDelete={noop} onTogglePin={noop} onToggleArchive={noop} />
            ))}
          </div>
        </section>
      )}
      {generalNotes.length > 0 && (
        <section>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-faint">Notas generales</h4>
          <div className="space-y-3">
            {generalNotes.map((note) => (
              <SongNoteCard key={note.id} note={note} canManage={false} onEdit={noop} onDelete={noop} onTogglePin={noop} onToggleArchive={noop} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
