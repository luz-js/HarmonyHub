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

let failSaving = false;

/** API falsa: solo lo que piden las pantallas para quien no tiene organizacion. */
const fakeApi = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const path = new URL(String(input), 'http://localhost').pathname;
  const method = init?.method ?? 'GET';
  if (path === '/api/auth/me') return json({ ok: true, user: { ...user, phone: null, instruments: [] } });
  if (path === '/api/me/invitations') return json([]);
  if (path === '/api/me/unavailability') return json([]);
  if (path === '/api/me' && method === 'PATCH') {
    return failSaving ? json({ message: 'El nombre es demasiado largo' }, 400) : json({ ok: true, user: { ...user, phone: '555-1234', avatarUrl: null } });
  }
  if (path === '/api/me/instruments' && method === 'PUT') return json({ ok: true, instruments: [] });
  return json({ message: `no esperado: ${method} ${path}` }, 404);
});

function openAt(path: string) {
  window.history.pushState({}, '', path);
  return render(
    <AppProviders>
      <App />
    </AppProviders>,
  );
}

async function saveProfile() {
  fireEvent.change(await screen.findByLabelText('Teléfono'), { target: { value: '555-1234' } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' })));
}

describe('cuenta sin organizacion: bienvenida, perfil e invitaciones sin crear una organizacion', () => {
  beforeEach(() => {
    failSaving = false;
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

  it('en Mi perfil "Entrar" (arriba y abajo) lleva a la bienvenida', async () => {
    openAt('/');
    fireEvent.click(await screen.findByText('Completar mi perfil'));
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument();
    const enter = screen.getAllByRole('button', { name: /^Entrar/ });
    expect(enter).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Volver al inicio/ })).not.toBeInTheDocument();

    await act(async () => fireEvent.click(enter[1]));
    expect(await screen.findByRole('heading', { name: '¡Hola, Persona!' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('al guardar el perfil aparece "¡Listo, tu perfil está completo!" y su "Entrar" lleva a la bienvenida', async () => {
    openAt('/profile');
    await saveProfile();
    const notice = await screen.findByRole('status', { name: 'Perfil completo' });
    expect(notice).toHaveTextContent('¡Listo, tu perfil está completo!');
    expect(notice).toHaveTextContent('crear tu organización o aceptar la invitación');
    expect(screen.queryByText('Cambios guardados.')).not.toBeInTheDocument();

    await act(async () => fireEvent.click(within(notice).getByRole('button', { name: /Entrar/ })));
    expect(await screen.findByRole('heading', { name: '¡Hola, Persona!' })).toBeInTheDocument();
  });

  it('"Seguir editando" cierra el aviso; si guardar falla, se ve el error y no el aviso', async () => {
    openAt('/profile');
    await saveProfile();
    fireEvent.click(within(await screen.findByRole('status', { name: 'Perfil completo' })).getByRole('button', { name: 'Seguir editando' }));
    expect(screen.queryByRole('status', { name: 'Perfil completo' })).not.toBeInTheDocument();

    failSaving = true;
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '555-9999' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' })));
    expect(await screen.findByRole('alert')).toHaveTextContent('El nombre es demasiado largo');
    expect(screen.queryByRole('status', { name: 'Perfil completo' })).not.toBeInTheDocument();
  });

  it('Mis invitaciones tambien funciona sin organizacion, con "Entrar"', async () => {
    openAt('/invitations');
    const main = await screen.findByRole('main');
    expect(within(main).getAllByRole('button', { name: /^Entrar/ })).toHaveLength(2);
  });
});
