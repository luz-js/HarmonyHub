import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../../shared/api/query-client';
import type { CurrentUser } from '../../../shared/types';
import { ProfilePage } from './ProfilePage';

vi.mock('../../auth/api/auth.client', () => ({
  getCurrentUser: vi.fn(),
  loginRequest: vi.fn(),
  registerRequest: vi.fn(),
  replaceMyInstruments: vi.fn(),
  updateMe: vi.fn(),
}));

import { getCurrentUser, replaceMyInstruments, updateMe } from '../../auth/api/auth.client';

function makeUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 'u1',
    name: 'Ana Martínez',
    email: 'ana@x.com',
    phone: '555-1234',
    avatarUrl: null,
    instruments: [
      { id: 'i1', instrument: 'KEYS', isPrimary: true },
      { id: 'i2', instrument: 'LEAD_VOCAL', isPrimary: false },
    ],
    organizations: [],
    ...overrides,
  };
}

function renderPage(onUserUpdated = vi.fn()) {
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  render(<ProfilePage onUserUpdated={onUserUpdated} />, { wrapper });
  return { onUserUpdated };
}

function chosenList() {
  return screen.getByRole('list', { name: 'Instrumentos elegidos' });
}

describe('ProfilePage', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(getCurrentUser).mockReset().mockResolvedValue({ ok: true, user: makeUser() });
    vi.mocked(updateMe).mockReset().mockImplementation(async (input) => ({ ok: true, user: { ...makeUser(), ...input } as CurrentUser }));
    vi.mocked(replaceMyInstruments).mockReset().mockResolvedValue({ ok: true, instruments: [] });
  });

  it('muestra los datos del usuario, el correo solo lectura y sus instrumentos con el principal marcado', async () => {
    renderPage();
    expect(await screen.findByLabelText('Nombre')).toHaveValue('Ana Martínez');
    expect(screen.getByLabelText('Correo')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Teléfono')).toHaveValue('555-1234');

    const chips = within(chosenList()).getAllByRole('listitem');
    expect(chips.map((chip) => chip.textContent)).toEqual([expect.stringContaining('Teclado'), expect.stringContaining('Voz principal')]);
    expect(within(chips[0]).getByLabelText('Principal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('agrega, cambia el principal, quita y guarda todo junto', async () => {
    const { onUserUpdated } = renderPage();
    const nameInput = await screen.findByLabelText('Nombre');

    fireEvent.change(nameInput, { target: { value: 'Ana M.' } });
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bajo' }));
    expect(screen.getByRole('button', { name: /Bajo/, pressed: true })).toBeInTheDocument();
    fireEvent.click(within(chosenList()).getAllByRole('button', { name: 'Hacer principal' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Teclado' }));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(replaceMyInstruments).toHaveBeenCalled());
    expect(updateMe).toHaveBeenCalledWith({ name: 'Ana M.', phone: null });
    expect(replaceMyInstruments).toHaveBeenCalledWith({
      instruments: [
        { instrument: 'LEAD_VOCAL', isPrimary: true },
        { instrument: 'BASS', isPrimary: false },
      ],
    });
    await waitFor(() => expect(onUserUpdated).toHaveBeenCalledWith({ name: 'Ana M.' }));
  });

  it('Cancelar descarta los cambios sin guardar', async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText('Nombre'), { target: { value: 'Otro nombre' } });
    fireEvent.click(screen.getByRole('button', { name: 'Batería' }));

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana Martínez');
    expect(within(chosenList()).queryByText('Batería')).not.toBeInTheDocument();
    expect(updateMe).not.toHaveBeenCalled();
  });

  it('no deja guardar un nombre vacío y muestra el error del servidor', async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText('Nombre'), { target: { value: '   ' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar cambios' }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Escribe tu nombre.');
    expect(updateMe).not.toHaveBeenCalled();

    vi.mocked(updateMe).mockRejectedValueOnce(new Error('El telefono es demasiado largo'));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El telefono es demasiado largo');
  });

  it('sin instrumentos muestra el estado vacío y el primero que elige queda como principal', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ ok: true, user: makeUser({ instruments: [] }) });
    renderPage();
    expect(await screen.findByText('Todavía no marcaste ningún instrumento.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Guitarra eléctrica' }));
    const chip = within(chosenList()).getByRole('listitem');
    expect(within(chip).getByLabelText('Principal')).toBeInTheDocument();
  });
});
