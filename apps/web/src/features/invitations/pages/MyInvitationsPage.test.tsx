import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../../shared/api/query-client';
import type { MyInvitation } from '../../../shared/types';
import { MyInvitationsBanner } from '../components/MyInvitationsBanner';
import { MyInvitationsPage } from './MyInvitationsPage';

vi.mock('../api/invitations.client', () => ({
  acceptInvitation: vi.fn(),
  acceptMyInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  createInvitation: vi.fn(),
  declineMyInvitation: vi.fn(),
  getInvitations: vi.fn(),
  getMyInvitations: vi.fn(),
}));

import { acceptMyInvitation, declineMyInvitation, getMyInvitations } from '../api/invitations.client';

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

function invitation(id: string, name: string, overrides: Partial<MyInvitation> = {}): MyInvitation {
  return {
    id,
    email: 'yo@correo.com',
    role: 'MUSICIAN',
    status: 'PENDING',
    expiresAt: '2026-10-29T12:00:00.000Z',
    createdAt: '2026-10-22T12:00:00.000Z',
    organization: { id: `org-${id}`, name, slug: `org-${id}` },
    invitedBy: { id: 'u1', name: 'Luz Mariel' },
    ...overrides,
  };
}

describe('MyInvitationsPage', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(getMyInvitations).mockReset().mockResolvedValue([invitation('1', 'Renacer', { role: 'LEADER' }), invitation('2', 'Banda Norte')]);
    vi.mocked(acceptMyInvitation).mockReset();
    vi.mocked(declineMyInvitation).mockReset();
  });

  it('lista las invitaciones con organización, quién invitó, rol y vencimiento', async () => {
    render(<MyInvitationsPage onAccepted={vi.fn()} />, { wrapper });
    const card = await screen.findByRole('article', { name: 'Invitación de Renacer' });
    expect(within(card).getByText(/Luz Mariel te invitó como líder · Vence el 29 oct/)).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Invitación de Banda Norte' })).toBeInTheDocument();
  });

  it('aceptar entra a esa organización con el rol de la invitación', async () => {
    vi.mocked(acceptMyInvitation).mockResolvedValue({ organization: { id: 'org-1', name: 'Renacer', slug: 'org-1', role: 'LEADER' } });
    const onAccepted = vi.fn();
    render(<MyInvitationsPage onAccepted={onAccepted} />, { wrapper });
    fireEvent.click(await screen.findByRole('button', { name: 'Unirme a Renacer' }));
    await waitFor(() => expect(onAccepted).toHaveBeenCalledWith({ id: 'org-1', name: 'Renacer', slug: 'org-1', role: 'LEADER' }));
    expect(acceptMyInvitation).toHaveBeenCalledWith('1');
  });

  it('rechazar pide confirmación', async () => {
    vi.mocked(declineMyInvitation).mockResolvedValue({} as never);
    render(<MyInvitationsPage onAccepted={vi.fn()} />, { wrapper });
    const card = await screen.findByRole('article', { name: 'Invitación de Banda Norte' });
    fireEvent.click(within(card).getByRole('button', { name: 'Rechazar' }));
    expect(declineMyInvitation).not.toHaveBeenCalled();
    fireEvent.click(within(card).getByRole('button', { name: 'Sí, rechazar' }));
    await waitFor(() => expect(declineMyInvitation).toHaveBeenCalledWith('2'));
  });

  it('muestra el error si la invitación ya venció', async () => {
    vi.mocked(acceptMyInvitation).mockRejectedValue(new Error('La invitacion expiro'));
    render(<MyInvitationsPage onAccepted={vi.fn()} />, { wrapper });
    fireEvent.click(await screen.findByRole('button', { name: 'Unirme a Renacer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La invitacion expiro');
  });

  it('sin invitaciones muestra el estado vacío', async () => {
    vi.mocked(getMyInvitations).mockResolvedValue([]);
    render(<MyInvitationsPage onAccepted={vi.fn()} />, { wrapper });
    expect(await screen.findByText('No tienes invitaciones pendientes')).toBeInTheDocument();
  });
});

describe('MyInvitationsBanner', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(getMyInvitations).mockReset();
  });

  it('con una invitación nombra la organización y lleva a Mis invitaciones', async () => {
    vi.mocked(getMyInvitations).mockResolvedValue([invitation('1', 'Renacer')]);
    const onOpen = vi.fn();
    render(<MyInvitationsBanner onOpen={onOpen} />, { wrapper });
    expect(await screen.findByText('Renacer te invitó a unirte.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver invitaciones' }));
    expect(onOpen).toHaveBeenCalled();
  });

  it('con varias muestra la cantidad; sin ninguna no muestra nada', async () => {
    vi.mocked(getMyInvitations).mockResolvedValue([invitation('1', 'Renacer'), invitation('2', 'Banda Norte')]);
    const { unmount } = render(<MyInvitationsBanner onOpen={vi.fn()} />, { wrapper });
    expect(await screen.findByText('Tienes 2 invitaciones para unirte a otras organizaciones.')).toBeInTheDocument();
    unmount();
    queryClient.clear();
    vi.mocked(getMyInvitations).mockResolvedValue([]);
    const { container } = render(<MyInvitationsBanner onOpen={vi.fn()} />, { wrapper });
    await waitFor(() => expect(getMyInvitations).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(container).toBeEmptyDOMElement();
  });
});
