import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Edit3,
  FileUp,
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
import { SongExportButtons } from './features/songs/components/export/SongExportButtons';
import { ImportChordProDialog } from './features/songs/components/import/ImportChordProDialog';
import type { SongContent as StructuredSongContent } from './features/songs/types/song-content.types';
import { legacyFieldsToSongContent, normalizeSongContent } from './features/songs/utils/song-content.utils';
import { getCurrentOrganizationId } from './shared/api/http';
import { takeUrlFlag } from './shared/utils';

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
  if (!seconds) return '—';
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
  const [showFilters, setShowFilters] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const activeFilterCount = [filters.key, filters.bpmMin, filters.bpmMax, filters.tag, filters.favorite].filter(Boolean).length;

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

  useEffect(() => {
    if (takeUrlFlag('nuevo')) setShowForm(true);
  }, []);

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function remove(song: SongSummary) {
    if (!window.confirm(`¿Archivar "${song.title}"? Dejará de aparecer en el repertorio.`)) return;
    await archiveSong(song.id);
    await loadSongs();
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Canciones</h1>
          <p className="page-subtitle">Tu repertorio con versiones, pistas, enlaces y archivos.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start md:self-auto">
          <button className="btn-ghost" onClick={() => setShowImport(true)}>
            <FileUp className="h-4 w-4" /> Importar ChordPro
          </button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Nueva canción
          </button>
        </div>
      </section>
      {showImport && <ImportChordProDialog songs={items} onClose={() => setShowImport(false)} onImported={(songId) => { setShowImport(false); navigate(`/songs/${songId}`); }} />}

      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); loadSongs(filters); }}>
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input className="input pl-9" value={filters.search} onChange={(event) => setFilter('search', event.target.value)} placeholder="Buscar canción o artista" aria-label="Buscar canción o artista" />
          </label>
          <button type="button" className="btn-ghost md:hidden" aria-expanded={showFilters} onClick={() => setShowFilters((value) => !value)}>
            <SlidersHorizontal className="h-4 w-4" /> Filtros{activeFilterCount > 0 && <span className="badge badge-primary min-h-[20px] px-1.5">{activeFilterCount}</span>}
          </button>
          <button className="btn-primary hidden md:inline-flex" type="submit"><Search className="h-4 w-4" /> Buscar</button>
        </div>
        <div className={`${showFilters ? 'grid' : 'hidden'} grid-cols-2 gap-3 md:grid md:grid-cols-5`}>
          <input className="input" value={filters.key} onChange={(event) => setFilter('key', event.target.value)} placeholder="Tono" aria-label="Tono" />
          <input className="input" inputMode="numeric" value={filters.bpmMin} onChange={(event) => setFilter('bpmMin', event.target.value)} placeholder="BPM mín." aria-label="BPM mínimo" />
          <input className="input" inputMode="numeric" value={filters.bpmMax} onChange={(event) => setFilter('bpmMax', event.target.value)} placeholder="BPM máx." aria-label="BPM máximo" />
          <input className="input" value={filters.tag} onChange={(event) => setFilter('tag', event.target.value)} placeholder="Etiqueta" aria-label="Etiqueta" />
          <select className="select col-span-2 md:col-span-1" value={filters.favorite} onChange={(event) => setFilter('favorite', event.target.value)} aria-label="Favoritas">
            <option value="">Todas las canciones</option>
            <option value="true">Solo favoritas</option>
            <option value="false">No favoritas</option>
          </select>
          <button className="btn-primary col-span-2 md:hidden" type="submit"><Search className="h-4 w-4" /> Aplicar filtros</button>
        </div>
      </form>

      {error && <Alert>{error}</Alert>}

      {loading && <section className="panel p-5 text-muted">Cargando canciones...</section>}
      {!loading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#30333A] bg-[#141518] px-6 py-12 text-center">
          <span className="icon-tile mx-auto h-12 w-12 rounded-2xl"><Music2 className="h-6 w-6" /></span>
          <h3 className="mt-4 text-lg font-bold text-white">{filters.search || activeFilterCount ? 'Ninguna canción coincide con la búsqueda.' : 'Todavía no hay canciones.'}</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
            {filters.search || activeFilterCount ? 'Prueba con otro nombre o quita algún filtro.' : 'Agrega la primera canción del repertorio con su letra, acordes y tono.'}
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="space-y-2 md:hidden">
            {items.map((song) => (
              <button key={song.id} type="button" className="panel flex w-full items-center gap-3 rounded-[14px] p-3.5 text-left" onClick={() => navigate(`/songs/${song.id}`)}>
                <span className="icon-tile h-11 w-11 shrink-0 rounded-xl font-mono text-sm font-semibold">{song.currentKey || <Music2 className="h-5 w-5" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-base font-bold text-white">
                    {song.isFavorite && <Star className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" />}
                    <span className="truncate">{song.title}</span>
                  </span>
                  <span className="block truncate text-sm text-muted">{[song.artist, song.bpm ? `${song.bpm} BPM` : '', song.durationSec ? duration(song.durationSec) : ''].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
            ))}
          </div>

          <section className="panel hidden overflow-hidden md:block">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Canción</th>
                    <th>Tono</th>
                    <th>BPM</th>
                    <th>Duración</th>
                    <th>Etiquetas</th>
                    <th>Actualizada</th>
                    <th><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((song) => (
                    <tr key={song.id}>
                      <td>
                        <button className="block text-left" onClick={() => navigate(`/songs/${song.id}`)}>
                          <span className="flex items-center gap-1.5 font-semibold text-white hover:text-primary">
                            {song.isFavorite && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
                            {song.title}
                          </span>
                          <span className="block text-sm text-muted">{song.artist}</span>
                        </button>
                      </td>
                      <td><span className="font-mono font-semibold text-primary">{song.currentKey || '—'}</span></td>
                      <td>{song.bpm || '—'}</td>
                      <td>{duration(song.durationSec)}</td>
                      <td><span className="flex flex-wrap gap-1">{song.tags.slice(0, 3).map((tag) => <span key={tag} className="badge">{tag}</span>)}</span></td>
                      <td className="text-muted">{song.updatedAt ? new Date(song.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <button className="btn-ghost h-9 w-9 p-0" title="Editar" aria-label={`Editar ${song.title}`} onClick={() => { setEditing(song); setShowForm(true); }}><Edit3 className="h-4 w-4" /></button>
                          <button className="btn-danger h-9 w-9 p-0" title="Archivar" aria-label={`Archivar ${song.title}`} onClick={() => remove(song)}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

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
      <form onSubmit={submit} className="panel w-full max-w-5xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">{song ? 'Editar canción' : 'Nueva canción'}</h2>
          <button type="button" className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
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
          <Field label="Etiquetas (separadas por coma)" value={form.tags} onChange={(value) => setField('tags', value)} />
        </div>
        {!song && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <TextField label="Letra rápida" value={form.lyrics} onChange={(value) => setField('lyrics', value)} />
            <TextField label="Acordes rápidos" value={form.chords} onChange={(value) => setField('chords', value)} />
            <TextField label="Notas" value={form.notes} onChange={(value) => setField('notes', value)} />
            <Field label="Enlace de YouTube" value={form.youtubeUrl} onChange={(value) => setField('youtubeUrl', value)} />
          </div>
        )}
        <label className="mt-4 flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={form.isFavorite} onChange={(event) => setField('isFavorite', event.target.checked)} />
          Marcar como favorita
        </label>
        {error && <Alert>{error}</Alert>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
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
  const [showChords] = useState(true);
  const [fontSize] = useState(16);
  const [transpose] = useState(0);
  const [transposeOpen, setTransposeOpen] = useState(false);
  const [temporaryContent, setTemporaryContent] = useState<StructuredSongContent | null>(null);
  const [temporaryKey, setTemporaryKey] = useState('');
  const [showEdit, setShowEdit] = useState(false);

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

  if (loading) return <section className="panel p-5 text-muted">Cargando canción...</section>;
  if (error || !song) return <section className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-4 text-sm text-[#F7A39A]">{error || 'Canción no encontrada'}</section>;

  return (
    <div className="space-y-5">
      <button className="-ml-2 inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted transition hover:text-white" onClick={() => navigate('/songs')}>
        <ArrowLeft className="h-4 w-4" /> Canciones
      </button>

      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="page-title flex flex-wrap items-center gap-2">
            {song.title}
            {song.isFavorite && <Star className="h-5 w-5 fill-primary text-primary" />}
          </h1>
          <p className="page-subtitle">{song.artist} · {activeVersion?.name || 'Sin versión'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="badge badge-primary font-mono">{activeVersion?.key || song.currentKey}</span>
            {(activeVersion?.bpm || song.bpm) && <span className="badge">{activeVersion?.bpm || song.bpm} BPM</span>}
            <span className="badge">{song.timeSignature || '4/4'}</span>
            {(activeVersion?.durationSec || song.durationSec) && <span className="badge">{duration(activeVersion?.durationSec || song.durationSec)}</span>}
            {temporaryKey && <span className="badge badge-blue">Vista temporal en {temporaryKey}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {temporaryKey && <button className="btn-ghost" onClick={() => {
            setTemporaryContent(null);
            setTemporaryKey('');
          }}>Volver al tono original</button>}
          {activeVersion && <TransposeButton onClick={() => setTransposeOpen(true)} />}
          {activeVersion && (
            <SongExportButtons
              title={song.title}
              artist={song.artist}
              timeSignature={song.timeSignature}
              bpm={activeVersion.bpm || song.bpm}
              versionKey={activeVersion.key}
              versionContent={structuredContent}
              viewKey={temporaryKey || activeVersion.key}
              viewContent={temporaryContent || structuredContent}
            />
          )}
          {canEditSong && <button className="btn-ghost" onClick={() => setShowEdit(true)}><Edit3 className="h-4 w-4" /> Editar</button>}
        </div>
      </section>

      <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Secciones de la canción">
        {[
          ['vista', 'Vista'],
          ['editor', 'Letra y acordes'],
          ['versiones', 'Versiones'],
          ['pistas', 'Pistas'],
          ['archivos', 'Archivos'],
          ['links', 'Enlaces'],
          ['notas', 'Notas'],
          ['colaboracion', 'Colaboración'],
          ['historial', 'Historial'],
        ].map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} className="tab-pill" onClick={() => setTab(key as DetailTab)}>{label}</button>)}
      </nav>

      {tab === 'vista' && (
        <section className="grid items-start gap-5 xl:grid-cols-[1fr_360px]">
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

      {showEdit && <SongForm song={song} organizationId={song.organizationId || getCurrentOrganizationId() || ''} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); void load(); }} />}

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
  );
}

function RightRail({ song, activeVersion }: { song: SongDetail; activeVersion: SongVersion | null }) {
  const organizationId = getCurrentOrganizationId() || '';
  const notesQuery = useSongNotes(organizationId, song.id);
  const notes = notesQuery.data || [];

  return (
    <div className="space-y-5">
      <section className="panel overflow-hidden">
        {song.coverUrl && <img src={song.coverUrl} alt={song.title} className="aspect-video w-full object-cover" />}
        <div className="space-y-4 p-5">
          <InfoGrid song={song} activeVersion={activeVersion} />
          <div className="flex flex-wrap gap-2">{song.tags.map((tag) => <span key={tag} className="badge badge-blue">{tag}</span>)}</div>
        </div>
      </section>
      <CompactPanel title="Enlaces" items={song.links.map((link) => `${link.provider}: ${link.title || link.url}`)} />
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
          <button className="btn-primary" onClick={save} disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      )}
      {draft.sections.map((section, index) => (
        <article key={`${section.name}-${index}`} className="rounded-xl border border-[#30333A] bg-[#141518] p-4">
          <span className="badge badge-primary">{section.name}</span>
          <div className="mt-5 space-y-3">
            {(section.lines || []).map((line, lineIndex) => (
              <div key={lineIndex} className="font-mono">
                {showChords && (
                  <input
                    className="w-full border-0 bg-transparent p-0 font-mono text-sm font-semibold leading-6 text-primary outline-none"
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
          <article key={version.id} className="rounded-xl border border-[#30333A] bg-[#141518] p-4">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="font-bold text-white">{version.name}</h3><p className="text-sm text-muted">{[version.key, version.bpm ? `${version.bpm} BPM` : '', version.durationSec ? duration(version.durationSec) : ''].filter(Boolean).join(' · ')}</p></div>
              {version.isDefault && <span className="badge badge-primary">Predeterminada</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={() => duplicate(version)}><Copy className="h-4 w-4" /> Duplicar</button>
              {!version.isDefault && <button className="btn-primary" onClick={() => makeDefault(version)}>Usar como predeterminada</button>}
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
    ['Álbum', song.album || '—'],
    ['Año', song.year || '—'],
    ['Duración', duration(activeVersion?.durationSec || song.durationSec)],
    ['Género', song.genre || '—'],
    ['Compás', song.timeSignature || '—'],
    ['Tonalidad', activeVersion?.key || song.currentKey],
    ['BPM', activeVersion?.bpm || song.bpm || '—'],
    ['Idioma', song.language || '—'],
  ];
  return <div><h2 className="section-title text-base">Información</h2><div className="mt-3 space-y-2">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 text-sm"><span className="text-muted">{label}</span><span className="text-right font-semibold text-white">{value}</span></div>)}</div></div>;
}

function CompactPanel({ title, items }: { title: string; items: string[] }) {
  return <Panel title={title}>{items.length ? <div className="space-y-2">{items.map((item) => <p key={item} className="truncate text-sm text-muted">{item}</p>)}</div> : <p className="text-sm text-faint">Nada por ahora.</p>}</Panel>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="label">{label}</span><input className="input" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="label">{label}</span><textarea className="textarea min-h-[120px]" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="panel p-5 sm:p-6"><h2 className="section-title">{title}</h2><div className="mt-4">{children}</div></section>;
}

function Modal({ children }: { children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm">{children}</div>;
}

function Alert({ children }: { children: ReactNode }) {
  return <div className="mt-4 rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-3 text-sm text-[#F7A39A]">{children}</div>;
}
