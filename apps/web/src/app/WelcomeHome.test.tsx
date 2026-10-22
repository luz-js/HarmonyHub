import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../shared/api/query-client';
import type { MyInvitation } from '../shared/types';
import { WelcomeHome } from './WelcomeHome';

vi.mock('../features/invitations/api/invitations.client', () => ({
  acceptInvitation: vi.fn(),
  acceptMyInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  createInvitation: vi.fn(),
  declineMyInvitation: vi.fn(),
  getInvitations: vi.fn(),
  getMyInvitations: vi.fn(),
}));

import { acceptMyInvitation, getMyInvitations } from '../features/invitations/api/invitations.client';

const user = { id: 'u1', name: 'Luz Mariel', email: 'luz@correo.com', organizations: [] };
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

const invitation: MyInvitation = {
  id: 'i1',
  email: 'luz@correo.com',
  role: 'LEADER',
  status: 'PENDING',
  expiresAt: '2026-10-29T12:00:00.000Z',
  createdAt: '2026-10-22T12:00:00.000Z',
  organization: { id: 'org-1', name: 'Renacer', slug: 'renacer' },
  invitedBy: { id: 'u2', name: 'Ana' },
};

function renderHome() {
  const props = { navigate: vi.fn(), onJoined: vi.fn() };
  render(<WelcomeHome user={user} {...props} />, { wrapper });
  return props;
}

describe('WelcomeHome', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(getMyInvitations).mockReset();
    vi.mocked(acceptMyInvitation).mockReset();
  });

  it('saluda por el nombre y muestra primero las invitaciones; unirse entra a esa organización', async () => {
    vi.mocked(getMyInvitations).mockResolvedValue([invitation]);
    vi.mocked(acceptMyInvitation).mockResolvedValue({ organization: { id: 'org-1', name: 'Renacer', slug: 'renacer', role: 'LEADER' } });
    const { onJoined } = renderHome();

    expect(screen.getByRole('heading', { name: '¡Hola, Luz!' })).toBeInTheDocument();
    const invitations = await screen.findByRole('heading', { name: /Te invitaron 1/ });
    const options = screen.getByRole('region', { name: 'Otras opciones' });
    // Las invitaciones van antes que crear una organizacion.
    expect(invitations.compareDocumentPosition(options) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Unirme a Renacer' }));
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith({ id: 'org-1', name: 'Renacer', slug: 'renacer', role: 'LEADER' }));
  });

  it('crear una organización, ver invitaciones y completar el perfil son opciones, no obligación', async () => {
    vi.mocked(getMyInvitations).mockResolvedValue([]);
    const { navigate } = renderHome();
    const options = screen.getByRole('region', { name: 'Otras opciones' });
    fireEvent.click(within(options).getByRole('button', { name: /Crear una organización/ }));
    expect(navigate).toHaveBeenCalledWith('/onboarding');
    fireEvent.click(within(options).getByRole('button', { name: /Completar mi perfil/ }));
    expect(navigate).toHaveBeenCalledWith('/profile');
    fireEvent.click(within(options).getByRole('button', { name: /Ver mis invitaciones/ }));
    expect(navigate).toHaveBeenCalledWith('/invitations');
  });

  it('sin invitaciones explica con qué correo la pueden invitar', async () => {
    vi.mocked(getMyInvitations).mockResolvedValue([]);
    renderHome();
    expect(await screen.findByText(/Pide que usen tu correo/)).toHaveTextContent('luz@correo.com');
    expect(screen.queryByRole('heading', { name: /Te invitaron/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Todavía no perteneces a ninguna organización/)).toBeInTheDocument();
  });
});
