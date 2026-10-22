import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../../../shared/api/query-client';
import type { ShareLink } from '../../../../shared/types';

vi.mock('../../api/setlists.client', () => ({
  getShareLinks: vi.fn(),
  createShareLink: vi.fn(),
  revokeShareLink: vi.fn(),
}));

import { createShareLink, getShareLinks, revokeShareLink } from '../../api/setlists.client';
import { ShareSetlistDialog } from './ShareSetlistDialog';

const TOKEN = 'a'.repeat(43);
const existing: ShareLink = {
  id: 'k1',
  createdAt: '2026-10-01T12:00:00.000Z',
  expiresAt: '2026-10-31T12:00:00.000Z',
  lastAccessedAt: null,
  accessCount: 0,
  createdBy: { id: 'u1', name: 'Ana Martínez' },
};

function renderDialog() {
  return render(
    <QueryClientProvider client={queryClient}>
      <ShareSetlistDialog organizationId="o1" setlistId="l1" setlistName="Domingo 8" onClose={() => undefined} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  queryClient.clear();
  vi.mocked(getShareLinks).mockResolvedValue({ items: [existing] });
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
});

afterEach(() => vi.clearAllMocks());

describe('ShareSetlistDialog', () => {
  it('lista los enlaces activos con quien lo creo, vencimiento y ultimo acceso', async () => {
    renderDialog();
    expect(await screen.findByText(/por Ana Martínez/)).toHaveTextContent('vence el');
    expect(screen.getByText(/por Ana Martínez/)).toHaveTextContent('todavía nadie lo abrió');
  });

  it('crea un enlace (30 dias por defecto), lo muestra una vez y lo copia', async () => {
    vi.mocked(createShareLink).mockResolvedValue({ ...existing, id: 'k2', token: TOKEN });
    renderDialog();
    expect(screen.getByRole('combobox', { name: 'Vence' })).toHaveValue('30d');
    fireEvent.change(screen.getByRole('combobox', { name: 'Vence' }), { target: { value: 'never' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Crear enlace/ })));

    expect(createShareLink).toHaveBeenCalledWith('l1', { duration: 'never' });
    const fresh = screen.getByRole('region', { name: 'Enlace nuevo' });
    expect(within(fresh).getByText(/no se vuelve a mostrar/)).toBeInTheDocument();
    const url = `${window.location.origin}/compartido/${TOKEN}`;
    expect(within(fresh).getByRole('textbox', { name: 'Enlace para compartir' })).toHaveValue(url);

    await act(async () => fireEvent.click(within(fresh).getByRole('button', { name: /Copiar/ })));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url);
    expect(within(fresh).getByRole('button', { name: /Copiado/ })).toBeInTheDocument();
  });

  it('revoca un enlace despues de confirmar', async () => {
    vi.mocked(revokeShareLink).mockResolvedValue({ ok: true });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderDialog();
    const revoke = await screen.findByRole('button', { name: /Revocar/ });

    await act(async () => fireEvent.click(revoke));
    expect(revokeShareLink).not.toHaveBeenCalled();

    vi.mocked(getShareLinks).mockResolvedValue({ items: [] });
    await act(async () => fireEvent.click(revoke));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(revokeShareLink).toHaveBeenCalledWith('l1', 'k1');
    await waitFor(() => expect(screen.getByText('No hay enlaces activos.')).toBeInTheDocument());
  });

  it('si falla al crear muestra el error', async () => {
    vi.mocked(createShareLink).mockRejectedValue(new Error('No tienes permiso para hacer esto'));
    renderDialog();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Crear enlace/ })));
    expect(screen.getByRole('alert')).toHaveTextContent('No tienes permiso');
    expect(screen.queryByRole('region', { name: 'Enlace nuevo' })).not.toBeInTheDocument();
  });
});
