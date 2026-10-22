import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../../shared/api/query-client';
import type { InvitationSummary } from '../../../shared/types';
import { InviteMemberDialog } from './InviteMemberDialog';
import { PendingInvitations } from './PendingInvitations';

vi.mock('../api/invitations.client', () => ({
  acceptInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  createInvitation: vi.fn(),
  getInvitations: vi.fn(),
}));

import { cancelInvitation, createInvitation, getInvitations } from '../api/invitations.client';

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

function invitation(id: string, overrides: Partial<InvitationSummary> = {}): InvitationSummary {
  return {
    id,
    organizationId: 'org1',
    email: `${id}@correo.com`,
    role: 'MUSICIAN',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    acceptedAt: null,
    createdAt: new Date().toISOString(),
    invitedBy: { id: 'u1', name: 'Luz Mariel' },
    ...overrides,
  };
}

describe('InviteMemberDialog', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(createInvitation).mockReset();
  });

  it('invita con correo y rol, y explica cómo se une la persona (sin correo automático)', async () => {
    vi.mocked(createInvitation).mockResolvedValue(invitation('nueva', { email: 'nueva@correo.com', role: 'LEADER' }));
    render(<InviteMemberDialog organizationId="org1" actorRole="OWNER" onClose={vi.fn()} />, { wrapper });

    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: ' nueva@correo.com ' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Rol' }), { target: { value: 'LEADER' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear invitación' }));

    await waitFor(() => expect(createInvitation).toHaveBeenCalledWith({ organizationId: 'org1', email: 'nueva@correo.com', role: 'LEADER' }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('invitaste a nueva@correo.com como líder');
    expect(status).toHaveTextContent('Todavía no enviamos correos');
  });

  it('solo un propietario ve la opción Propietario', () => {
    const { unmount } = render(<InviteMemberDialog organizationId="org1" actorRole="ADMIN" onClose={vi.fn()} />, { wrapper });
    expect(within(screen.getByRole('combobox', { name: 'Rol' })).queryByRole('option', { name: 'Propietario' })).not.toBeInTheDocument();
    unmount();
    render(<InviteMemberDialog organizationId="org1" actorRole="OWNER" onClose={vi.fn()} />, { wrapper });
    expect(within(screen.getByRole('combobox', { name: 'Rol' })).getByRole('option', { name: 'Propietario' })).toBeInTheDocument();
  });

  it('muestra el error claro de la API (duplicado o ya es miembro)', async () => {
    vi.mocked(createInvitation).mockRejectedValue(new Error('Esa persona ya es miembro de la organizacion'));
    render(<InviteMemberDialog organizationId="org1" actorRole="OWNER" onClose={vi.fn()} />, { wrapper });
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana@correo.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear invitación' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Esa persona ya es miembro de la organizacion');
  });
});

describe('PendingInvitations', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(getInvitations).mockReset();
    vi.mocked(cancelInvitation).mockReset().mockResolvedValue(invitation('a', { status: 'CANCELLED' }));
  });

  it('lista solo las pendientes, con quién invitó, vencimiento y las vencidas marcadas', async () => {
    vi.mocked(getInvitations).mockResolvedValue([
      invitation('a', { role: 'LEADER' }),
      invitation('b', { expiresAt: new Date(Date.now() - 86_400_000).toISOString() }),
      invitation('c', { status: 'ACCEPTED' }),
      invitation('d', { status: 'CANCELLED' }),
    ]);
    render(<PendingInvitations organizationId="org1" />, { wrapper });
    expect(await screen.findByText('a@correo.com')).toBeInTheDocument();
    expect(screen.getByText('b@correo.com')).toBeInTheDocument();
    expect(screen.queryByText('c@correo.com')).not.toBeInTheDocument();
    expect(screen.queryByText('d@correo.com')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Invitaciones pendientes 2/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Invitó Luz Mariel · Vence el/)).toHaveLength(1);
    expect(screen.getByText(/Venció el/)).toBeInTheDocument();
    expect(screen.getByText('Vencida')).toBeInTheDocument();
  });

  it('cancelar pide confirmación y llama a la API', async () => {
    vi.mocked(getInvitations).mockResolvedValue([invitation('a')]);
    render(<PendingInvitations organizationId="org1" />, { wrapper });
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar la invitación de a@correo.com' }));
    expect(cancelInvitation).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }));
    await waitFor(() => expect(cancelInvitation).toHaveBeenCalledWith('a'));
  });

  it('sin pendientes no muestra nada', async () => {
    vi.mocked(getInvitations).mockResolvedValue([invitation('c', { status: 'ACCEPTED' })]);
    const { container } = render(<PendingInvitations organizationId="org1" />, { wrapper });
    await waitFor(() => expect(getInvitations).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
