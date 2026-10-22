import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../../shared/api/query-client';
import type { OrganizationFile } from '../../../shared/types';
import { ArchivesPage } from './ArchivesPage';

vi.mock('../api/files.client', () => ({ listOrganizationFiles: vi.fn() }));

import { listOrganizationFiles } from '../api/files.client';

function makeFile(id: string, overrides: Partial<OrganizationFile> = {}): OrganizationFile {
  return {
    id,
    songId: `song-${id}`,
    versionId: null,
    category: 'LYRIC_PDF',
    title: `Archivo ${id}`,
    description: null,
    isPrimary: false,
    sortOrder: 0,
    active: true,
    version: null,
    file: {
      id: `f-${id}`,
      name: `archivo-${id}.docx`,
      originalName: null,
      mimeType: 'application/msword',
      sizeBytes: 2048,
      url: `/api/songs/song-${id}/files/${id}/download`,
      createdAt: '2026-10-12T10:00:00.000Z',
      uploadedBy: { id: 'u1', name: 'Ana Martínez' },
    },
    createdAt: '2026-10-12T10:00:00.000Z',
    updatedAt: '2026-10-12T10:00:00.000Z',
    song: { id: `song-${id}`, title: `Canción ${id}`, artist: 'Hillsong' },
    ...overrides,
  };
}

const files = [
  makeFile('1', { title: 'Gratitud - Letra', category: 'LYRIC_PDF', song: { id: 'song-1', title: 'Gratitud', artist: 'Brandon Lake' } }),
  makeFile('2', { title: 'Cifrado', category: 'CHORD_CHART', song: { id: 'song-2', title: 'Como en el Cielo', artist: 'Elevation' } }),
  makeFile('3', { title: 'Partitura piano', category: 'PIANO_SCORE', song: { id: 'song-2', title: 'Como en el Cielo', artist: 'Elevation' } }),
];

function renderPage(navigate = vi.fn()) {
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  render(<ArchivesPage organizationId="org1" navigate={navigate} />, { wrapper });
  return { navigate };
}

const rows = () => within(screen.getByRole('region', { name: 'Lista de archivos' })).getAllByRole('button', { name: /^Ver / });

describe('ArchivesPage', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(listOrganizationFiles).mockReset().mockResolvedValue({ items: files });
  });

  it('lista los archivos reales con su canción, tamaño, quién lo subió y categoría', async () => {
    renderPage();
    await screen.findByText('Gratitud - Letra');
    expect(rows()).toHaveLength(3);
    const row = screen.getByRole('button', { name: 'Ver Gratitud - Letra' });
    expect(within(row).getByText('Gratitud · Brandon Lake')).toBeInTheDocument();
    expect(within(row).getByText(/2\.0 KB · Ana Martínez · 12 oct 2026/)).toBeInTheDocument();
    expect(screen.queryByText(/datos de ejemplo/)).not.toBeInTheDocument();
  });

  it('filtra por tipo (solo muestra los grupos que tienen archivos) y busca por canción o artista', async () => {
    renderPage();
    await screen.findByText('Gratitud - Letra');
    expect(screen.getByRole('button', { name: /Partituras 1/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Imágenes/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Acordes 1/ }));
    expect(rows().map((row) => row.getAttribute('aria-label'))).toEqual(['Ver Cifrado']);

    fireEvent.click(screen.getByRole('button', { name: /Todos 3/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar archivo' }), { target: { value: 'elevacion' } });
    expect(screen.getByText('Nada coincide con la búsqueda o el filtro.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar archivo' }), { target: { value: 'ELEVATION' } });
    expect(rows()).toHaveLength(2);
  });

  it('abre la vista previa del archivo y lleva a su canción', async () => {
    const { navigate } = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Ver Cifrado' }));
    expect(await screen.findByRole('button', { name: /Descargar/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir la canción Gratitud' }));
    expect(navigate).toHaveBeenCalledWith('/songs/song-1');
  });

  it('sin archivos muestra el estado vacío con acceso a Canciones', async () => {
    vi.mocked(listOrganizationFiles).mockResolvedValue({ items: [] });
    const { navigate } = renderPage();
    expect(await screen.findByText('Todavía no hay archivos')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Buscar archivo' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ir a Canciones/ }));
    expect(navigate).toHaveBeenCalledWith('/songs');
  });
});
