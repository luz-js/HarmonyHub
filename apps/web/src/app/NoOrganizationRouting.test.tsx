import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { queryClient } from '../shared/api/query-client';
import { AppProviders } from './AppProviders';

/** Cuenta recien creada, sin ninguna organizacion (como queda despues de "Crear cuenta"). */
const user = { id: 'u-nueva', name: 'Persona Nueva', email: 'nueva@correo.com', organizations: [] };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** API falsa: solo lo que piden las pantallas para quien no tiene organizacion. */
const fakeApi = vi.fn(async (input: RequestInfo | URL) => {
  const path = new URL(String(input), 'http://localhost').pathname;
  if (path === '/api/auth/me') return json({ ok: true, user: { ...user, phone: null, instruments: [] } });
  if (path === '/api/me/invitations') return json([]);
  if (path === '/api/me/unavailability') return json([]);
  return json({ message: `no esperado: ${path}` }, 404);
});

function openAt(path: string) {
  window.history.pushState({}, '', path);
  return render(
    <AppProviders>
      <App />
    </AppProviders>,
  );
}

describe('cuenta sin organizacion: bienvenida, perfil e invitaciones sin crear una organizacion', () => {
  beforeEach(() => {
    queryClient.clear();
    localStorage.clear();
    localStorage.setItem('hh_access_token', 'token-de-prueba');
    localStorage.setItem('hh_user', JSON.stringify(user));
    vi.stubGlobal('fetch', fakeApi);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  it('al entrar (o en cualquier pagina de la app) aterriza en la bienvenida, sin obligar a crear una organizacion', async () => {
    openAt('/songs');
    expect(await screen.findByRole('heading', { name: '¡Hola, Persona!' })).toBeInTheDocument();
    expect(screen.getByText('Crear una organización')).toBeInTheDocument();
    expect(screen.getByText('Completar mi perfil')).toBeInTheDocument();
  });

  it('desde Mi perfil se vuelve a la bienvenida con "Volver al inicio" (arriba y abajo de la pagina)', async () => {
    openAt('/');
    fireEvent.click(await screen.findByText('Completar mi perfil'));
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument();
    const back = screen.getAllByRole('button', { name: /Volver al inicio/ });
    expect(back).toHaveLength(2);

    await act(async () => fireEvent.click(back[1]));
    expect(await screen.findByRole('heading', { name: '¡Hola, Persona!' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('Mis invitaciones tambien funciona sin organizacion', async () => {
    openAt('/invitations');
    const main = await screen.findByRole('main');
    expect(within(main).getAllByRole('button', { name: /Volver al inicio/ })).toHaveLength(2);
  });
});
