import { useMemo, useState } from 'react';
import { Plus, StickyNote } from 'lucide-react';
import {
  useArchiveSongNote,
  useCreateSongNote,
  useDeleteSongNote,
  usePinSongNote,
  useSongNotes,
  useUpdateSongNote,
} from '../../hooks';
import type { SongNote, SongVersion } from '../../../../shared/types';
import { getCurrentOrganizationId } from '../../../../shared/api/http';
import { SongNoteDialog, SongNoteDraft, defaultSongNoteDraft } from './CreateSongNoteDialog';
import { SongNoteCard } from './SongNoteCard';
import { NOTE_FILTER_OPTIONS, NoteFilter, filterNotes, getCurrentUser, groupNotes } from './note.utils';

export function SongNotesPanel({
  songId,
  versions,
  activeVersionId,
  onChanged,
}: {
  songId: string;
  versions: SongVersion[];
  activeVersionId: string | null;
  onChanged?: () => void;
}) {
  const organizationId = getCurrentOrganizationId() || '';
  const currentUser = useMemo(() => getCurrentUser(), []);
  const notesQuery = useSongNotes(organizationId, songId, { includeArchived: true });
  const createMutation = useCreateSongNote(organizationId, songId);
  const updateMutation = useUpdateSongNote(organizationId, songId);
  const deleteMutation = useDeleteSongNote(organizationId, songId);
  const pinMutation = usePinSongNote(organizationId, songId);
  const archiveMutation = useArchiveSongNote(organizationId, songId);

  const [filter, setFilter] = useState<NoteFilter>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<SongNote | null>(null);
  const [formError, setFormError] = useState('');

  const notes = useMemo(() => notesQuery.data || [], [notesQuery.data]);
  const filteredNotes = useMemo(() => filterNotes(notes, filter), [notes, filter]);
  const grouped = useMemo(() => groupNotes(filteredNotes, activeVersionId, currentUser.id), [filteredNotes, activeVersionId, currentUser.id]);
  const canCreate = currentUser.role !== 'GUEST';

  function notifyChange() {
    onChanged?.();
  }

  function canManageNote(note: SongNote) {
    if (note.author?.id === currentUser.id) return true;
    if (note.visibility === 'PRIVATE') return false;
    return currentUser.role === 'OWNER' || currentUser.role === 'ADMIN';
  }

  async function handleCreate(draft: SongNoteDraft) {
    setFormError('');
    if (!draft.content.trim()) {
      setFormError('El contenido es requerido.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        title: draft.title || undefined,
        content: draft.content,
        visibility: draft.visibility,
        versionId: draft.versionId || null,
        isPinned: draft.isPinned,
      });
      notifyChange();
      setShowAddDialog(false);
    } catch (error: any) {
      setFormError(error?.message || 'No se pudo guardar la nota');
    }
  }

  async function handleUpdate(draft: SongNoteDraft) {
    if (!editingNote) return;
    setFormError('');
    if (!draft.content.trim()) {
      setFormError('El contenido es requerido.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        noteId: editingNote.id,
        input: { title: draft.title || null, content: draft.content, visibility: draft.visibility, versionId: draft.versionId || null },
      });
      notifyChange();
      setEditingNote(null);
    } catch (error: any) {
      setFormError(error?.message || 'No se pudo actualizar la nota');
    }
  }

  async function handleDelete(note: SongNote) {
    if (!window.confirm('¿Eliminar esta nota?')) return;
    await deleteMutation.mutateAsync(note.id);
    notifyChange();
  }

  function renderSection(title: string, subtitle: string, sectionNotes: SongNote[], badgeClass: string) {
    if (sectionNotes.length === 0) return null;
    return (
      <section className="panel p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="text-xs text-muted">{subtitle}</p>
          </div>
          <span className={`badge ${badgeClass}`}>{sectionNotes.length}</span>
        </div>
        <div className="space-y-3">
          {sectionNotes.map((note) => (
            <SongNoteCard
              key={note.id}
              note={note}
              canManage={canManageNote(note)}
              onEdit={() => {
                setFormError('');
                setEditingNote(note);
              }}
              onDelete={() => void handleDelete(note)}
              onTogglePin={() => void pinMutation.mutateAsync(note.id).then(notifyChange)}
              onToggleArchive={() => void archiveMutation.mutateAsync(note.id).then(notifyChange)}
            />
          ))}
        </div>
      </section>
    );
  }

  const loading = notesQuery.isLoading;
  const error = notesQuery.error instanceof Error ? notesQuery.error.message : '';
  const isGrouped = filter === 'all';

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#30333A] bg-[#141518] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Notas del equipo</p>
            <h2 className="mt-2 text-xl font-bold text-white">Ideas, recordatorios y decisiones</h2>
            <p className="mt-1 text-sm text-muted">Deja notas privadas, para el equipo o solo para líderes.</p>
          </div>
          {canCreate && (
            <button className="btn-primary" onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4" /> Agregar nota</button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {NOTE_FILTER_OPTIONS.map(([key, label]) => (
            <button key={key} className={filter === key ? 'btn-primary' : 'btn-ghost'} onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>
      </section>

      {loading && <section className="panel p-5 text-muted">Cargando notas...</section>}
      {error && <section className="rounded-md border border-[#F27A6E]/30 bg-[#2A1817] p-4 text-sm text-[#F7A39A]">{error}</section>}

      {!loading && !error && filteredNotes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#30333A] bg-[#141518] px-6 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#30333A] bg-[#23252A] text-primary">
            <StickyNote className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-white">Todavía no hay notas.</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">Deja una nota privada, para la organización o solo para líderes.</p>
          {canCreate && (
            <div className="mt-5 flex justify-center">
              <button className="btn-primary" onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4" /> Agregar nota</button>
            </div>
          )}
        </div>
      )}

      {!loading && !error && filteredNotes.length > 0 && (
        <div className="space-y-5">
          {isGrouped ? (
            <>
              {renderSection('Notas fijadas', 'Destacadas por el equipo.', grouped.pinned, 'badge-primary')}
              {renderSection('Notas de esta versión', versions.find((version) => version.id === activeVersionId)?.name || 'Versión activa', grouped.versionNotes, 'badge-primary')}
              {renderSection('Notas generales', 'Disponibles para cualquier versión de esta canción.', grouped.generalNotes, 'badge')}
              {renderSection('Mis notas privadas', 'Solo visibles para ti.', grouped.privateNotes, 'badge-blue')}
            </>
          ) : (
            renderSection(NOTE_FILTER_OPTIONS.find(([key]) => key === filter)?.[1] || 'Notas', '', filteredNotes, 'badge')
          )}
        </div>
      )}

      {showAddDialog && (
        <SongNoteDialog
          mode="create"
          role={currentUser.role}
          versions={versions}
          initial={defaultSongNoteDraft(activeVersionId)}
          submitting={createMutation.isPending}
          error={formError}
          onSubmit={(draft) => void handleCreate(draft)}
          onClose={() => {
            setFormError('');
            setShowAddDialog(false);
          }}
        />
      )}

      {editingNote && (
        <SongNoteDialog
          mode="edit"
          role={currentUser.role}
          versions={versions}
          initial={{ title: editingNote.title || '', content: editingNote.content, visibility: editingNote.visibility, versionId: editingNote.versionId || '', isPinned: editingNote.isPinned }}
          submitting={updateMutation.isPending}
          error={formError}
          onSubmit={(draft) => void handleUpdate(draft)}
          onClose={() => {
            setFormError('');
            setEditingNote(null);
          }}
        />
      )}
    </div>
  );
}
