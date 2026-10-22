import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { queryClient } from '../shared/api/query-client';
import { AppProviders } from './AppProviders';

/** Cuenta recien creada, sin ninguna organizacion (como queda despues de "Crear cuenta"). */
const user = { id: 'u-nueva', name: 'Persona Nueva', email: 'nueva@correo.com', organizations: [] };
const invitation = {
  id: 'inv-1',
  email: 'nueva@correo.com',
  role: 'MUSICIAN',
  status: 'PENDING',
  expiresAt: '2026-10-29T12:00:00.000Z',
  createdAt: '2026-10-22T12:00:00.000Z',
  organization: { id: 'org-renacer', name: 'Renacer', slug: 'renacer' },
  invitedBy: { id: 'u2', name: 'Ana' },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let failSaving = false;
/** Perfil guardado en la API falsa (telefono e instrumentos). */
let profile: { phone: string | null; instruments: Array<{ id: string; instrument: string; isPrimary: boolean }> } = { phone: null, instruments: [] };
let invitations: unknown[] = [];
let joined = false;
const requested: string[] = [];

/** API falsa: anota cada pedido para comprobar que sin organizacion no se piden datos de organizacion. */
const fakeApi = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const path = new URL(String(input), 'http://localhost').pathname;
  const method = init?.method ?? 'GET';
  requested.push(`${method} ${path}`);
  if (path === '/api/auth/me') return json({ ok: true, user: { ...user, ...profile } });
  if (path === '/api/me/invitations') return json(invitations);
  if (path === '/api/me/unavailability') return json([]);
  if (path === '/api/organizations') {
    return json(joined ? [{ role: 'MUSICIAN', organization: { id: 'org-renacer', name: 'Renacer', slug: 'renacer', archivedAt: null } }] : []);
  }
  if (path === '/api/notifications/unread-count') return json({ unread: 0 });
  if (path === '/api/me' && method === 'PATCH') {
    if (failSaving) return json({ message: 'El nombre es demasiado largo' }, 400);
    const body = JSON.parse(String(init?.body ?? '{}')) as { phone?: string | null };
    if (body.phone !== undefined) profile.phone = body.phone;
    return json({ ok: true, user: { ...user, phone: profile.phone, avatarUrl: null } });
  }
  if (path === '/api/me/instruments' && method === 'PUT') {
    const body = JSON.parse(String(init?.body ?? '{}')) as { instruments: Array<{ instrument: string; isPrimary?: boolean }> };
    profile.instruments = body.instruments.map((item, index) => ({ id: `i${index}`, instrument: item.instrument, isPrimary: Boolean(item.isPrimary) || index === 0 }));
    return json({ ok: true, instruments: profile.instruments });
  }
  if (path === '/api/me/invitations/inv-1/accept' && method === 'POST') {
    invitations = [];
    joined = true;
    return json({ organization: { id: 'org-renacer', name: 'Renacer', slug: 'renacer', role: 'MUSICIAN' } });
  }
  if (path === '/api/me/active-organization' && method === 'PUT') return json({ ok: true, activeOrganizationId: 'org-renacer' });
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

/** Guarda el perfil: telefono y, si se pide, un instrumento (con los dos, el perfil queda completo). */
async function saveProfile({ phone = '555-1234', withInstrument = true } = {}) {
  fireEvent.change(await screen.findByLabelText('Teléfono'), { target: { value: phone } });
  if (withInstrument) fireEvent.click(screen.getByRole('button', { name: 'Bajo' }));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' })));
}

const ORGANIZATION_API = /^GET \/api\/(songs|setlists|events|memberships|files|dashboard|calendar)/;

describe('cuenta sin organizacion: entra a la aplicacion', () => {
  beforeEach(() => {
    failSaving = false;
    profile = { phone: null, instruments: [] };
    invitations = [];
    joined = false;
    requested.length = 0;
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

  it('Inicio: la app normal (menu lateral, selector "Sin organización") con la bienvenida y sus tres acciones', async () => {
    openAt('/');
    expect(await screen.findByRole('heading', { name: '¡Hola, Persona!' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Canciones' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sin organización').length).toBeGreaterThan(0);
    const options = screen.getByRole('region', { name: 'Otras opciones' });
    for (const name of [/Crear una organización/, /Ver mis invitaciones/, /Completar mi perfil/]) {
      expect(within(options).getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('con el perfil completo (telefono y algun instrumento) la tarjeta dice "Editar mi perfil"', async () => {
    profile = { phone: '555-1234', instruments: [{ id: 'i0', instrument: 'BASS', isPrimary: true }] };
    openAt('/');
    const options = await screen.findByRole('region', { name: 'Otras opciones' });
    expect(await within(options).findByRole('button', { name: /Editar mi perfil/ })).toHaveTextContent('ya están al día');
    expect(within(options).queryByRole('button', { name: /Completar mi perfil/ })).not.toBeInTheDocument();
  });

  it('las paginas de la organizacion muestran como empezar y no piden datos a la API', async () => {
    openAt('/songs');
    expect(await screen.findByRole('heading', { name: 'Canciones' })).toBeInTheDocument();
    expect(screen.getByText('Esto es de tu organización')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('link', { name: 'Setlists' })[0]);
    expect(await screen.findByRole('heading', { name: 'Setlists' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('link', { name: 'Eventos' })[0]);
    expect(await screen.findByRole('heading', { name: 'Eventos' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Crear una organización/ }));
    expect(window.location.pathname).toBe('/onboarding');
    expect(requested.filter((call) => ORGANIZATION_API.test(call))).toEqual([]);
  });

  it('en Mi perfil "Volver al inicio" (arriba y abajo) lleva al Inicio de la app; ya no dice "Entrar"', async () => {
    openAt('/profile');
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument();
    const back = screen.getAllByRole('button', { name: /Volver al inicio/ });
    expect(back).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Entrar/ })).not.toBeInTheDocument();
    await act(async () => fireEvent.click(back[1]));
    expect(await screen.findByRole('heading', { name: '¡Hola, Persona!' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('al completar el perfil aparece "¡Listo, tu perfil está completo!" y su "Ir al inicio" lleva al Inicio', async () => {
    openAt('/profile');
    await saveProfile();
    const notice = await screen.findByRole('status', { name: 'Perfil completo' });
    expect(notice).toHaveTextContent('¡Listo, tu perfil está completo!');
    expect(screen.queryByText('Cambios guardados.')).not.toBeInTheDocument();
    await act(async () => fireEvent.click(within(notice).getByRole('button', { name: /Ir al inicio/ })));
    expect(await screen.findByRole('heading', { name: '¡Hola, Persona!' })).toBeInTheDocument();
  });

  it('si guarda pero sigue incompleto, o si ya estaba completo, se ve "Cambios guardados." y no el aviso', async () => {
    openAt('/profile');
    await saveProfile({ withInstrument: false });
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Perfil completo' })).not.toBeInTheDocument();
  });

  it('editar un perfil que ya estaba completo muestra "Cambios guardados."', async () => {
    profile = { phone: '555-0000', instruments: [{ id: 'i0', instrument: 'KEYS', isPrimary: true }] };
    openAt('/profile');
    await saveProfile({ withInstrument: false });
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Perfil completo' })).not.toBeInTheDocument();
  });

  it('si guardar falla, se ve el error y no el aviso', async () => {
    failSaving = true;
    openAt('/profile');
    await saveProfile();
    expect(await screen.findByRole('alert')).toHaveTextContent('El nombre es demasiado largo');
    expect(screen.queryByRole('status', { name: 'Perfil completo' })).not.toBeInTheDocument();
  });

  it('al aceptar una invitacion la app pasa a esa organizacion sin recargar', async () => {
    invitations = [invitation];
    openAt('/invitations');
    expect(await screen.findAllByRole('button', { name: /Volver al inicio/ })).toHaveLength(2);
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: 'Unirme a Renacer' })));
    await waitFor(() => expect(localStorage.getItem('hh_current_organization_id')).toBe('org-renacer'));
    expect(window.location.pathname).toBe('/');
    expect(screen.queryByRole('heading', { name: '¡Hola, Persona!' })).not.toBeInTheDocument();
    expect((await screen.findAllByText('Renacer')).length).toBeGreaterThan(0);
  });
});
