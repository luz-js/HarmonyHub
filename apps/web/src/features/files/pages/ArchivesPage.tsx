import { useMemo, useState } from 'react';
import { FolderOpen, Music2, Search } from 'lucide-react';
import type { Navigate } from '../../../app/types';
import type { OrganizationFile } from '../../../shared/types';
import { FileCategoryBadge } from '../../songs/components/files/FileCategoryBadge';
import { FilePreviewDialog } from '../../songs/components/files/FilePreviewDialog';
import { fileCategoryLabels, formatBytes } from '../../songs/components/files/file.utils';
import { useOrganizationFiles } from '../hooks';
import { countByGroup, FILE_FILTER_OPTIONS, filterOrganizationFiles, formatFileDate, type FileFilter } from '../utils/files.utils';

type ArchivesPageProps = {
  organizationId: string;
  navigate: Navigate;
};

/** Archivos de todas las canciones de la organizacion: se suben desde cada cancion y aqui se encuentran juntos. */
export function ArchivesPage({ organizationId, navigate }: ArchivesPageProps) {
  const filesQuery = useOrganizationFiles(organizationId);
  const [group, setGroup] = useState<FileFilter>('all');
  const [search, setSearch] = useState('');
  const [previewing, setPreviewing] = useState<OrganizationFile | null>(null);

  const files = useMemo(() => filesQuery.data || [], [filesQuery.data]);
  const counts = useMemo(() => countByGroup(files), [files]);
  const visible = useMemo(() => filterOrganizationFiles(files, { group, search }), [files, group, search]);
  const filtering = Boolean(search.trim()) || group !== 'all';

  return (
    <div className="space-y-5">
      <section>
        <h1 className="page-title">Archivos</h1>
        <p className="page-subtitle">Partituras, letras y documentos de todas tus canciones, en un solo lugar.</p>
      </section>

      {files.length > 0 && (
        <>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              className="input pl-9"
              placeholder="Buscar por archivo, canción o artista..."
              aria-label="Buscar archivo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <section className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Filtrar por tipo">
            {FILE_FILTER_OPTIONS.filter(([value]) => value === 'all' || counts[value] > 0).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`tab-pill ${group === value ? 'is-active' : ''}`}
                aria-pressed={group === value}
                onClick={() => setGroup(value)}
              >
                {label} <span className="text-xs opacity-80">{counts[value]}</span>
              </button>
            ))}
          </section>
        </>
      )}

      {filesQuery.isLoading && <section className="panel p-5 text-muted">Cargando archivos...</section>}
      {filesQuery.error instanceof Error && (
        <section className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-4 text-sm text-[#F7A39A]">{filesQuery.error.message}</section>
      )}

      {!filesQuery.isLoading && !filesQuery.error && files.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#30333A] bg-[#141518] px-6 py-12 text-center">
          <span className="icon-tile mx-auto h-12 w-12 rounded-2xl">
            <FolderOpen className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-bold text-white">Todavía no hay archivos</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Las letras, partituras y cifrados que subas en cada canción aparecerán aquí para que el equipo los encuentre rápido.
          </p>
          <button type="button" className="btn-ghost mt-5" onClick={() => navigate('/songs')}>
            <Music2 className="h-4 w-4" /> Ir a Canciones
          </button>
        </div>
      )}

      {visible.length > 0 && (
        <section className="panel divide-y divide-[#23252A]" aria-label="Lista de archivos">
          {visible.map((file) => (
            <FileRow key={file.id} file={file} onPreview={() => setPreviewing(file)} onOpenSong={() => navigate(`/songs/${file.song.id}`)} />
          ))}
        </section>
      )}

      {files.length > 0 && visible.length === 0 && filtering && (
        <p className="rounded-2xl border border-dashed border-[#30333A] px-6 py-8 text-center text-sm text-muted">Nada coincide con la búsqueda o el filtro.</p>
      )}

      {previewing && <FilePreviewDialog songFile={previewing} songTitle={previewing.song.title} onClose={() => setPreviewing(null)} />}
    </div>
  );
}

function FileRow({ file, onPreview, onOpenSong }: { file: OrganizationFile; onPreview: () => void; onOpenSong: () => void }) {
  const meta = [formatBytes(file.file.sizeBytes), file.file.uploadedBy?.name, formatFileDate(file.file.createdAt)].filter((value) => value && value !== '-');

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
      <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onPreview} aria-label={`Ver ${file.title}`}>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-white">{file.title}</span>
          <span className="block truncate text-sm text-muted">
            {file.song.title}
            {file.song.artist ? ` · ${file.song.artist}` : ''}
            {file.version ? ` · ${file.version.name}` : ''}
          </span>
          <span className="mt-1 block truncate text-xs text-faint">{meta.join(' · ')}</span>
          {/* En el celular la categoria va debajo; en pantallas grandes, a la derecha. */}
          <span className="mt-1.5 block sm:hidden">
            <FileCategoryBadge category={file.category} />
          </span>
        </span>
        <span className="hidden shrink-0 sm:block" title={fileCategoryLabels[file.category]}>
          <FileCategoryBadge category={file.category} />
        </span>
      </button>
      <button type="button" className="btn-ghost h-10 w-10 shrink-0 p-0" onClick={onOpenSong} aria-label={`Abrir la canción ${file.song.title}`} title="Abrir la canción">
        <Music2 className="h-4 w-4" />
      </button>
    </div>
  );
}
