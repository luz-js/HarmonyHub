import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  MoreHorizontal,
  Music2,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
} from 'lucide-react';
import {
  archiveSong,
  createSong,
  createSongVersion,
  getSong,
  listSongs,
  SongContent,
  SongDetail,
  SongSummary,
  SongVersion,
  updateSong,
  updateSongVersion,
} from './api';
import { SongCollaborationPanel, SongEditor as StructuredSongEditor, SongFilesPanel, SongHistoryPanel, SongLinksPanel, SongNotesPanel, SongTracksPanel, TransposeButton, TransposeDialog } from './features/songs/components';
import { useSongNotes } from './features/songs/hooks';
import { AudioPlayerProvider } from './features/songs/player';
import type { SongContent as StructuredSongContent } from './features/songs/types/song-content.types';
import { legacyFieldsToSongContent, normalizeSongContent } from './features/songs/utils/song-content.utils';
import { getCurrentOrganizationId } from './shared/api/http';

type Navigate = (href: string) => void;
type User = { currentOrganizationId?: string };
type DetailTab = 'vista' | 'editor' | 'versiones' | 'pistas' | 'archivos' | 'links' | 'notas' | 'colaboracion' | 'historial';

const emptySongForm = {
  title: '',
  artist: '',
  currentKey: 'D',
  originalKey: 'D',
  bpm: '72',
  durationSec: '270',
  album: '',
  year: '',
  genre: 'Adoración',
  timeSignature: '4/4',
  language: 'Español',
  tags: '',
  notes: '',
  lyrics: '',
  chords: '',
  youtubeUrl: '',
  isFavorite: false,
};

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

function transposeChord(chord: string, semitones: number) {
  return chord.replace(/\b([A-G](?:#|b)?)(m|maj|min|dim|aug|sus|add|[0-9]|\/|[^\s]*)?/g, (match, root, suffix = '') => {
    const normalized = FLAT_TO_SHARP[root] || root;
    const index = CHROMATIC.indexOf(normalized);
    if (index < 0) return match;
    return `${CHROMATIC[(index + semitones + 120) % 12]}${suffix}`;
  });
}

function splitChordMarkup(chords = '', lyrics = '') {
  const matches = Array.from(chords.matchAll(/\[([^\]]+)\]/g));
  if (!matches.length) {
    return { chords, lyrics };
  }

  const plainLyrics = lyrics || chords.replace(/\[[^\]]+\]/g, '');
  const chordSlots = Array(Math.max(plainLyrics.length + 24, chords.length)).fill(' ');
  let removed = 0;

  matches.forEach((match) => {
    const chord = match[1];
    const sourceIndex = match.index || 0;
    const targetIndex = Math.max(0, sourceIndex - removed);
    chord.split('').forEach((char, index) => {
      chordSlots[targetIndex + index] = char;
    });
    removed += match[0].length;
  });

  return {
    chords: chordSlots.join('').trimEnd(),
    lyrics: plainLyrics.trimEnd(),
  };
}

function splitChartLines(chords = '', lyrics = '') {
  const chordLines = chords.split(/\r?\n/);
  const lyricLines = lyrics.split(/\r?\n/);
  const total = Math.max(chordLines.length, lyricLines.length, 1);
  return Array.from({ length: total }, (_, index) => splitChordMarkup(chordLines[index] || '', lyricLines[index] || ''));
}

function flattenContent(content: SongContent) {
  return {
    sections: content.sections.map((section) => ({
      ...section,
      lines: (section.lines?.length ? section.lines : [{ chords: section.chords?.join('   ') || '', lyrics: section.lyrics || '' }])
        .flatMap((line) => splitChartLines(line.chords, line.lyrics)),
    })),
  };
}

function duration(seconds?: number | null) {
  if (!seconds) return '-';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function toContent(version?: SongVersion | null): SongContent {
  if (version?.contentJson?.sections?.length) return flattenContent(version.contentJson);
  return {
    sections: [
      {
        name: 'Principal',
        lines: splitChartLines(version?.chords || '', version?.lyrics || ''),
      },
    ],
  };
}

function songToForm(song?: SongSummary) {
  if (!song) return emptySongForm;
  return {
    ...emptySongForm,
    title: song.title,
    artist: song.artist,
    currentKey: song.currentKey,
    originalKey: song.originalKey,
    bpm: String(song.bpm || ''),
    durationSec: String(song.durationSec || ''),
    album: song.album || '',
    year: String(song.year || ''),
    genre: song.genre || '',
    timeSignature: song.timeSignature || '',
    language: song.language || '',
    tags: song.tags.join(', '),
    isFavorite: song.isFavorite,
  };
}

function formToPayload(form: typeof emptySongForm, organizationId: string) {
  return {
    organizationId,
    title: form.title,
    artist: form.artist,
    originalKey: form.originalKey,
    currentKey: form.currentKey,
    bpm: form.bpm ? Number(form.bpm) : undefined,
    durationSec: form.durationSec ? Number(form.durationSec) : undefined,
    album: form.album,
    year: form.year ? Number(form.year) : undefined,
    genre: form.genre,
    timeSignature: form.timeSignature,
    language: form.language,
    tags: form.tags,
    notes: form.notes,
    lyrics: form.lyrics,
    chords: form.chords,
    youtubeUrl: form.youtubeUrl,
    isFavorite: form.isFavorite,
  };
}

export function SongsPage({ user, navigate }: { user: User; navigate: Navigate }) {
  const organizationId = user.currentOrganizationId || 'org-banda-renacer';
  const [items, setItems] = useState<SongSummary[]>([]);
  const [filters, setFilters] = useState({ search: '', key: '', bpmMin: '', bpmMax: '', tag: '', status: '', favorite: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<SongSummary | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function loadSongs(nextFilters = filters) {
    setLoading(true);
    setError('');
    try {
      setItems(await listSongs(organizationId, nextFilters));
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar las canciones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSongs({ search: '', key: '', bpmMin: '', bpmMax: '', tag: '', status: '', favorite: '' });
  }, [organizationId]);

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function remove(song: SongSummary) {
    if (!window.confirm(`Archivar "${song.title}"?`)) return;
    await archiveSong(song.id);
    await loadSongs();
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Canciones</h1>
          <p className="mt-1 text-sm text-muted">Biblioteca musical con versiones, pistas, links y archivos.</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> Nueva canción
        </button>
      </section>

      <section className="panel p-4">
        <form className="grid gap-3 md:grid-cols-[1.2fr_110px_110px_110px_120px_120px_auto]" onSubmit={(event) => { event.preventDefault(); loadSongs(filters); }}>
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input className="input pl-9" value={filters.search} onChange={(event) => setFilter('search', event.target.value)} placeholder="Buscar canción o artista" />
          </label>
          <input className="input" value={filters.key} onChange={(event) => setFilter('key', event.target.value)} placeholder="Tono" />
          <input className="input" value={filters.bpmMin} onChange={(event) => setFilter('bpmMin', event.target.value)} placeholder="BPM min" />
          <input className="input" value={filters.bpmMax} onChange={(event) => setFilter('bpmMax', event.target.value)} placeholder="BPM max" />
          <input className="input" value={filters.tag} onChange={(event) => setFilter('tag', event.target.value)} placeholder="Tag" />
          <select className="select" value={filters.favorite} onChange={(event) => setFilter('favorite', event.target.value)}>
            <option value="">Todas</option>
            <option value="true">Favoritas</option>
            <option value="false">No favoritas</option>
          </select>
          <button className="btn-ghost" type="submit"><SlidersHorizontal className="h-4 w-4" /> Filtrar</button>
        </form>
      </section>

      {error && <Alert>{error}</Alert>}

      <section className="panel overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Canción</th>
                <th>Artista</th>
                <th>Tono</th>
                <th>BPM</th>
                <th>Duración</th>
                <th>Tags</th>
                <th>Actualizada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-muted">Cargando canciones...</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={8} className="text-muted">No hay canciones todavía.</td></tr>}
              {items.map((song) => (
                <tr key={song.id}>
                  <td>
                    <button className="text-left font-semibold text-white hover:text-primary" onClick={() => navigate(`/songs/${song.id}`)}>
                      {song.isFavorite && <Star className="mr-2 inline h-3.5 w-3.5 fill-[#f3b33e] text-[#f3b33e]" />}
                      {song.title}
                    </button>
                  </td>
                  <td className="text-muted">{song.artist}</td>
                  <td>{song.currentKey}</td>
                  <td>{song.bpm || '-'}</td>
                  <td>{duration(song.durationSec)}</td>
                  <td><span className="flex flex-wrap gap-1">{song.tags.slice(0, 3).map((tag) => <span key={tag} className="badge">{tag}</span>)}</span></td>
                  <td className="text-muted">{song.updatedAt ? new Date(song.updatedAt).toLocaleDateString() : '-'}</td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost h-8 w-8 p-0" title="Ver" onClick={() => navigate(`/songs/${song.id}`)}><Eye className="h-4 w-4" /></button>
                      <button className="btn-ghost h-8 w-8 p-0" title="Editar" onClick={() => { setEditing(song); setShowForm(true); }}><Edit3 className="h-4 w-4" /></button>
                      <button className="btn-ghost h-8 w-8 p-0" title="Duplicar"><Copy className="h-4 w-4" /></button>
                      <button className="btn-danger h-8 w-8 p-0" title="Archivar" onClick={() => remove(song)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && <SongForm song={editing || undefined} organizationId={organizationId} onClose={() => setShowForm(false)} onSaved={async (song) => { setShowForm(false); await loadSongs(); navigate(`/songs/${song.id}`); }} />}
    </div>
  );
}

function SongForm({ song, organizationId, onClose, onSaved }: { song?: SongSummary; organizationId: string; onClose: () => void; onSaved: (song: SongSummary) => void }) {
  const [form, setForm] = useState(songToForm(song));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = formToPayload(form, organizationId);
      const saved = song ? await updateSong(song.id, payload) : await createSong(payload);
      onSaved(saved);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la canción');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal>
      <form onSubmit={submit} className="panel w-full max-w-5xl p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">{song ? 'Editar canción' : 'Nueva canción'}</h2>
          <button type="button" className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <Field label="Título" value={form.title} onChange={(value) => setField('title', value)} />
          <Field label="Artista" value={form.artist} onChange={(value) => setField('artist', value)} />
          <Field label="Tonalidad" value={form.currentKey} onChange={(value) => setField('currentKey', value)} />
          <Field label="Tonalidad original" value={form.originalKey} onChange={(value) => setField('originalKey', value)} />
          <Field label="BPM" value={form.bpm} onChange={(value) => setField('bpm', value)} />
          <Field label="Duración en segundos" value={form.durationSec} onChange={(value) => setField('durationSec', value)} />
          <Field label="Álbum" value={form.album} onChange={(value) => setField('album', value)} />
          <Field label="Año" value={form.year} onChange={(value) => setField('year', value)} />
          <Field label="Compás" value={form.timeSignature} onChange={(value) => setField('timeSignature', value)} />
          <Field label="Género" value={form.genre} onChange={(value) => setField('genre', value)} />
          <Field label="Idioma" value={form.language} onChange={(value) => setField('language', value)} />
          <Field label="Tags" value={form.tags} onChange={(value) => setField('tags', value)} />
        </div>
        {!song && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <TextField label="Letra rápida" value={form.lyrics} onChange={(value) => setField('lyrics', value)} />
            <TextField label="Acordes rápidos" value={form.chords} onChange={(value) => setField('chords', value)} />
            <TextField label="Notas" value={form.notes} onChange={(value) => setField('notes', value)} />
            <Field label="YouTube inicial" value={form.youtubeUrl} onChange={(value) => setField('youtubeUrl', value)} />
          </div>
        )}
        <label className="mt-4 flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={form.isFavorite} onChange={(event) => setField('isFavorite', event.target.checked)} />
          Marcar como favorita
        </label>
        {error && <Alert>{error}</Alert>}
        <div className="mt-5 flex justify-end">
          <button className="btn-primary" disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function SongDetailPage({ id, navigate }: { id: string; navigate: Navigate }) {
  const [song, setSong] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<DetailTab>('vista');
  const [showChords, setShowChords] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [transpose, setTranspose] = useState(0);
  const [transposeOpen, setTransposeOpen] = useState(false);
  const [temporaryContent, setTemporaryContent] = useState<StructuredSongContent | null>(null);
  const [temporaryKey, setTemporaryKey] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setSong(await getSong(id));
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar la canción');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const activeVersion = song?.activeVersion || song?.versions?.[0] || null;
  const content = useMemo(() => toContent(activeVersion), [activeVersion]);
  const structuredContent = useMemo(() => {
    if (!activeVersion) return normalizeSongContent(content);
    return normalizeSongContent(activeVersion.contentJson || legacyFieldsToSongContent(activeVersion.lyrics, activeVersion.chords));
  }, [activeVersion, content]);
  const visibleContent = temporaryContent || content;
  const canEditSong = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('hh_user') || '{}') as { role?: string };
      return ['OWNER', 'ADMIN', 'LEADER'].includes(user.role || '');
    } catch {
      return false;
    }
  }, []);
  const chords = useMemo(() => Array.from(new Set(content.sections.flatMap((section) => [
    ...(section.chords || []),
    ...(section.lines || []).flatMap((line) => splitChordMarkup(line.chords, line.lyrics).chords.split(/\s+/).filter(Boolean)),
  ]))).slice(0, 12), [content]);

  if (loading) return <section className="panel p-5 text-muted">Cargando canción...</section>;
  if (error || !song) return <section className="panel p-5 text-red-200">{error || 'Canción no encontrada'}</section>;

  return (
    <AudioPlayerProvider>
      <div className="space-y-5">
      <button className="btn-ghost" onClick={() => navigate('/songs')}><ArrowLeft className="h-4 w-4" /> Volver a canciones</button>

      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-3xl font-bold text-white">
            {song.title}
            {song.isFavorite && <Star className="h-5 w-5 fill-[#f3b33e] text-[#f3b33e]" />}
          </h1>
          <p className="mt-1 text-sm text-muted">{song.artist} · {activeVersion?.name || 'Sin versión'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge">{activeVersion?.key || song.currentKey}</span>
          <span className="badge">{activeVersion?.bpm || song.bpm || '-'} BPM</span>
          <span className="badge">{song.timeSignature || '4/4'}</span>
          <span className="badge">{duration(activeVersion?.durationSec || song.durationSec)}</span>
          <button className="btn-ghost"><Edit3 className="h-4 w-4" /> Editar</button>
          {activeVersion && <TransposeButton onClick={() => setTransposeOpen(true)} />}
          {temporaryKey && <span className="badge badge-primary">Vista temporal en {temporaryKey}</span>}
          {temporaryKey && <button className="btn-ghost" onClick={() => {
            setTemporaryContent(null);
            setTemporaryKey('');
          }}>Volver a original</button>}
          <button className="btn-primary"><Plus className="h-4 w-4" /> Agregar a setlist</button>
          <button className="btn-ghost h-9 w-9 p-0"><MoreHorizontal className="h-4 w-4" /></button>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2">
        {[
          ['vista', 'Vista'],
          ['editor', 'Letra y acordes'],
          ['versiones', 'Versiones'],
          ['pistas', 'Pistas'],
          ['archivos', 'Archivos'],
          ['links', 'Links'],
          ['notas', 'Notas'],
          ['colaboracion', 'Colaboración'],
          ['historial', 'Historial'],
        ].map(([key, label]) => <button key={key} className={tab === key ? 'btn-primary' : 'btn-ghost'} onClick={() => setTab(key as DetailTab)}>{label}</button>)}
      </nav>

      {tab === 'vista' && (
        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <Panel title="Letra y acordes">
            <SongContentView content={visibleContent} showChords={showChords} fontSize={fontSize} transpose={transpose} songId={song.id} version={activeVersion} onSaved={load} />
          </Panel>
          <RightRail song={song} activeVersion={activeVersion} />
        </section>
      )}

      {tab === 'editor' && activeVersion && <StructuredSongEditor songId={song.id} versionId={activeVersion.id} readOnly={!canEditSong} onSaved={load} />}
      {tab === 'versiones' && <VersionsTab song={song} onSaved={load} />}
      {tab === 'pistas' && <SongTracksPanel songId={song.id} songTitle={song.title} versions={song.versions} activeVersionId={activeVersion?.id || null} canManage={canEditSong} onChanged={load} />}
      {tab === 'archivos' && <SongFilesPanel songId={song.id} songTitle={song.title} versions={song.versions} activeVersionId={activeVersion?.id || null} canManage={canEditSong} onChanged={load} />}
      {tab === 'links' && <SongLinksPanel songId={song.id} versions={song.versions} activeVersionId={activeVersion?.id || null} canManage={canEditSong} onChanged={load} />}
      {tab === 'notas' && <SongNotesPanel songId={song.id} versions={song.versions} activeVersionId={activeVersion?.id || null} onChanged={load} />}
      {tab === 'colaboracion' && <SongCollaborationPanel songId={song.id} versions={song.versions} activeVersionId={activeVersion?.id || null} onChanged={load} />}
      {tab === 'historial' && <SongHistoryPanel songId={song.id} versions={song.versions} activeVersionId={activeVersion?.id || null} canManage={canEditSong} onChanged={load} />}

      {activeVersion && (
        <TransposeDialog
          open={transposeOpen}
          onClose={() => setTransposeOpen(false)}
          songId={song.id}
          version={activeVersion}
          versions={song.versions}
          content={structuredContent}
          readOnly={!canEditSong}
          onTemporary={(key, nextContent) => {
            setTemporaryKey(key);
            setTemporaryContent(nextContent);
          }}
          onResetTemporary={() => {
            setTemporaryKey('');
            setTemporaryContent(null);
          }}
          onSaved={load}
        />
      )}
      </div>
    </AudioPlayerProvider>
  );
}

function RightRail({ song, activeVersion }: { song: SongDetail; activeVersion: SongVersion | null }) {
  const organizationId = getCurrentOrganizationId() || '';
  const notesQuery = useSongNotes(organizationId, song.id);
  const notes = notesQuery.data || [];

  return (
    <div className="space-y-5">
      <section className="panel overflow-hidden">
        <div className="aspect-square bg-[#0d1826]">
          {song.coverUrl ? <img src={song.coverUrl} alt={song.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Music2 className="h-16 w-16 text-primary" /></div>}
        </div>
        <div className="space-y-4 p-5">
          <InfoGrid song={song} activeVersion={activeVersion} />
          <div className="flex flex-wrap gap-2">{song.tags.map((tag) => <span key={tag} className="badge badge-blue">{tag}</span>)}</div>
        </div>
      </section>
      <CompactPanel title="Links externos" items={song.links.map((link) => `${link.provider}: ${link.title || link.url}`)} />
      <CompactPanel title="Pistas principales" items={song.tracks.slice(0, 4).map((track) => `${track.name} · ${duration(track.durationSec)}`)} />
      <CompactPanel title="Archivos" items={song.songFiles.map((item) => `${item.category}: ${item.file.name}`)} />
      <CompactPanel title="Notas" items={notes.slice(0, 3).map((note) => note.content)} />
    </div>
  );
}

function SongContentView({ content, showChords, fontSize, transpose, songId, version, onSaved }: { content: SongContent; showChords: boolean; fontSize: number; transpose: number; songId?: string; version?: SongVersion | null; onSaved?: () => void }) {
  const [draft, setDraft] = useState<SongContent>(content);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(content);
  }, [content]);

  function updateLine(sectionIndex: number, lineIndex: number, field: 'chords' | 'lyrics', value: string) {
    setDraft((current) => ({
      sections: current.sections.map((section, index) => index === sectionIndex
        ? { ...section, lines: (section.lines || []).map((line, nextIndex) => nextIndex === lineIndex ? { ...line, [field]: value } : line) }
        : section),
    }));
  }

  async function save() {
    if (!songId || !version) return;
    setSaving(true);
    const lyrics = draft.sections.flatMap((section) => (section.lines || []).map((line) => line.lyrics || '')).join('\n');
    const chords = draft.sections.flatMap((section) => (section.lines || []).map((line) => line.chords || '')).join('\n');
    await updateSongVersion(songId, version.id, { contentJson: draft, lyrics, chords });
    setSaving(false);
    onSaved?.();
  }

  return (
    <div className="space-y-6" style={{ fontSize }}>
      {songId && version && (
        <div className="flex justify-end">
          <button className="btn-primary" onClick={save} disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar chart'}</button>
        </div>
      )}
      {draft.sections.map((section, index) => (
        <article key={`${section.name}-${index}`} className="rounded-md border border-[#1b2c40] bg-[#091522] p-4">
          <span className="badge badge-primary">{section.name}</span>
          <div className="mt-5 space-y-3">
            {(section.lines || []).map((line, lineIndex) => (
              <div key={lineIndex} className="font-mono">
                {showChords && (
                  <input
                    className="w-full border-0 bg-transparent p-0 font-mono text-sm leading-6 text-primary outline-none"
                    value={transpose ? transposeChord(line.chords || '', transpose) : line.chords || ''}
                    onChange={(event) => updateLine(index, lineIndex, 'chords', event.target.value)}
                    spellCheck={false}
                  />
                )}
                <input
                  className="w-full border-0 bg-transparent p-0 font-mono leading-7 text-white outline-none"
                  value={line.lyrics || ''}
                  onChange={(event) => updateLine(index, lineIndex, 'lyrics', event.target.value)}
                  spellCheck={false}
                />
              </div>
            ))}
          </div>
          {section.notes && <p className="mt-3 text-xs text-muted">{section.notes}</p>}
        </article>
      ))}
    </div>
  );
}

function SongEditor({ songId, version, showChords, setShowChords, fontSize, setFontSize, transpose, setTranspose, onSaved }: { songId: string; version: SongVersion; showChords: boolean; setShowChords: (value: boolean) => void; fontSize: number; setFontSize: (value: number) => void; transpose: number; setTranspose: (value: number | ((current: number) => number)) => void; onSaved: () => void }) {
  const [content, setContent] = useState<SongContent>(toContent(version));
  const [saving, setSaving] = useState(false);

  function updateLine(sectionIndex: number, lineIndex: number, field: 'chords' | 'lyrics', value: string) {
    setContent((current) => ({
      sections: current.sections.map((section, index) => index === sectionIndex
        ? { ...section, lines: (section.lines || [{ chords: '', lyrics: '' }]).map((line, nextIndex) => nextIndex === lineIndex ? { ...line, [field]: value } : line) }
        : section),
    }));
  }

  function addSection() {
    setContent((current) => ({ sections: [...current.sections, { name: 'Nueva sección', lines: [{ chords: '', lyrics: '' }] }] }));
  }

  function updateSection(sectionIndex: number, field: 'name' | 'notes', value: string) {
    setContent((current) => ({
      sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, [field]: value } : section),
    }));
  }

  function addLine(sectionIndex: number) {
    setContent((current) => ({
      sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, lines: [...(section.lines || []), { chords: '', lyrics: '' }] } : section),
    }));
  }

  function deleteLine(sectionIndex: number, lineIndex: number) {
    setContent((current) => ({
      sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, lines: (section.lines || []).filter((_, nextIndex) => nextIndex !== lineIndex) } : section),
    }));
  }

  function duplicateSection(sectionIndex: number) {
    setContent((current) => {
      const section = current.sections[sectionIndex];
      const clone = { ...section, name: `${section.name} copia`, lines: [...(section.lines || [])] };
      return { sections: [...current.sections.slice(0, sectionIndex + 1), clone, ...current.sections.slice(sectionIndex + 1)] };
    });
  }

  function moveSection(sectionIndex: number, direction: -1 | 1) {
    setContent((current) => {
      const nextIndex = sectionIndex + direction;
      if (nextIndex < 0 || nextIndex >= current.sections.length) return current;
      const sections = [...current.sections];
      const [section] = sections.splice(sectionIndex, 1);
      sections.splice(nextIndex, 0, section);
      return { sections };
    });
  }

  function deleteSection(sectionIndex: number) {
    setContent((current) => ({ sections: current.sections.filter((_, index) => index !== sectionIndex) }));
  }

  async function save(asNew = false) {
    setSaving(true);
    const lyrics = content.sections.flatMap((section) => (section.lines || []).map((line) => line.lyrics || '')).join('\n');
    const chords = content.sections.flatMap((section) => (section.lines || []).map((line) => line.chords || '')).join('\n');
    if (asNew) {
      await createSongVersion(songId, { ...version, id: undefined, name: `${version.name} copia`, contentJson: content, lyrics, chords, isDefault: false });
    } else {
      await updateSongVersion(songId, version.id, { contentJson: content, lyrics, chords });
    }
    setSaving(false);
    onSaved();
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <Panel title="Editor visual">
        <div className="mb-4 flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => setShowChords(!showChords)}>{showChords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} Acordes</button>
          <button className="btn-ghost" onClick={() => setFontSize(Math.max(13, fontSize - 1))}>A-</button>
          <button className="btn-ghost" onClick={() => setFontSize(Math.min(24, fontSize + 1))}>A+</button>
          <button className="btn-ghost" onClick={() => setTranspose((value) => value - 1)}>-1/2</button>
          <button className="btn-ghost" onClick={() => setTranspose((value) => value + 1)}>+1/2</button>
          <button className="btn-ghost" onClick={addSection}><Plus className="h-4 w-4" /> Sección</button>
          <button className="btn-primary" onClick={() => save(false)} disabled={saving}><Save className="h-4 w-4" /> Guardar</button>
          <button className="btn-ghost" onClick={() => save(true)} disabled={saving}>Guardar como versión</button>
        </div>
        <div className="space-y-4">
          {content.sections.map((section, sectionIndex) => (
            <article key={sectionIndex} className="rounded-md border border-[#1b2c40] bg-[#091522] p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                <input className="input min-w-[220px] flex-1 font-bold text-primary" value={section.name} onChange={(event) => updateSection(sectionIndex, 'name', event.target.value)} />
                <button type="button" className="btn-ghost" onClick={() => moveSection(sectionIndex, -1)}>Subir</button>
                <button type="button" className="btn-ghost" onClick={() => moveSection(sectionIndex, 1)}>Bajar</button>
                <button type="button" className="btn-ghost" onClick={() => duplicateSection(sectionIndex)}><Copy className="h-4 w-4" /> Duplicar</button>
                <button type="button" className="btn-danger" onClick={() => deleteSection(sectionIndex)}><Trash2 className="h-4 w-4" /> Borrar</button>
              </div>
              {(section.lines || [{ chords: '', lyrics: '' }]).map((line, lineIndex) => (
                <div key={lineIndex} className="mb-3 grid gap-2 md:grid-cols-[180px_1fr_auto]">
                  <input className="input font-mono text-[#ffd37b]" value={line.chords || ''} onChange={(event) => updateLine(sectionIndex, lineIndex, 'chords', event.target.value)} placeholder="D   A   Bm   G" />
                  <input className="input" value={line.lyrics || ''} onChange={(event) => updateLine(sectionIndex, lineIndex, 'lyrics', event.target.value)} placeholder="Letra de la línea" />
                </div>
              ))}
            </article>
          ))}
        </div>
      </Panel>
      <Panel title="Vista previa">
        <SongContentView content={content} showChords={showChords} fontSize={fontSize} transpose={transpose} />
      </Panel>
    </section>
  );
}

function VersionsTab({ song, onSaved }: { song: SongDetail; onSaved: () => void }) {
  async function duplicate(version: SongVersion) {
    await createSongVersion(song.id, { ...version, id: undefined, name: `${version.name} copia`, isDefault: false });
    onSaved();
  }

  async function makeDefault(version: SongVersion) {
    await updateSongVersion(song.id, version.id, { isDefault: true });
    onSaved();
  }

  return (
    <Panel title="Versiones">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {song.versions.map((version) => (
          <article key={version.id} className="rounded-md border border-[#1b2c40] bg-[#091522] p-4">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="font-bold text-white">{version.name}</h3><p className="text-sm text-muted">{version.key} · {version.bpm || '-'} BPM · {duration(version.durationSec)}</p></div>
              {version.isDefault && <span className="badge badge-primary">Default</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={() => duplicate(version)}><Copy className="h-4 w-4" /> Duplicar</button>
              {!version.isDefault && <button className="btn-primary" onClick={() => makeDefault(version)}>Marcar default</button>}
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function InfoGrid({ song, activeVersion }: { song: SongDetail; activeVersion: SongVersion | null }) {
  const rows = [
    ['Autor', song.artist],
    ['Álbum', song.album || '-'],
    ['Año', song.year || '-'],
    ['Duración', duration(activeVersion?.durationSec || song.durationSec)],
    ['Género', song.genre || '-'],
    ['Compás', song.timeSignature || '-'],
    ['Tonalidad', activeVersion?.key || song.currentKey],
    ['BPM', activeVersion?.bpm || song.bpm || '-'],
    ['Idioma', song.language || '-'],
  ];
  return <div><h2 className="section-title text-base">Información</h2><div className="mt-3 space-y-2">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 text-sm"><span className="text-muted">{label}</span><span className="text-right font-semibold text-white">{value}</span></div>)}</div></div>;
}

function CompactPanel({ title, items }: { title: string; items: string[] }) {
  return <Panel title={title}>{items.length ? <div className="space-y-2">{items.map((item) => <p key={item} className="truncate text-sm text-muted">{item}</p>)}</div> : <p className="text-sm text-muted">Sin datos.</p>}</Panel>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="label">{label}</span><input className="input" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="label">{label}</span><textarea className="textarea min-h-[120px]" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="panel p-5"><h2 className="section-title">{title}</h2><div className="mt-4">{children}</div></section>;
}

function Modal({ children }: { children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8">{children}</div>;
}

function Alert({ children }: { children: ReactNode }) {
  return <div className="mt-4 rounded-md border border-[#ff5c77]/30 bg-red-500/10 p-3 text-sm text-red-200">{children}</div>;
}
