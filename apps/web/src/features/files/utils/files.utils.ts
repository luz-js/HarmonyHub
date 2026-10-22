import type { OrganizationFile } from '../../../shared/types';
import { FILE_FILTER_OPTIONS, filterSongFiles, type FileFilter } from '../../songs/components/files/file.utils';

export { FILE_FILTER_OPTIONS, type FileFilter };

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Busca por titulo, nombre del archivo, cancion o artista, sin importar acentos ni mayusculas. */
export function matchesFileSearch(file: OrganizationFile, search: string) {
  const term = normalize(search);
  if (!term) return true;
  return [file.title, file.file.name, file.file.originalName || '', file.song.title, file.song.artist].some((value) => normalize(value).includes(term));
}

export function filterOrganizationFiles(files: OrganizationFile[], filters: { group: FileFilter; search: string }) {
  return (filterSongFiles(files, filters.group) as OrganizationFile[]).filter((file) => matchesFileSearch(file, filters.search));
}

/** Cuantos archivos hay en cada grupo de filtro (Letras, Acordes, Partituras...). */
export function countByGroup(files: OrganizationFile[]): Record<FileFilter, number> {
  return Object.fromEntries(FILE_FILTER_OPTIONS.map(([group]) => [group, filterSongFiles(files, group).length])) as Record<FileFilter, number>;
}

/** "12 oct 2026". */
export function formatFileDate(value: string) {
  return new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
}
