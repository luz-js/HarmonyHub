import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../../shared/api/query-client';
import type { EventDetail } from '../../../shared/types';
import { EventTeamPanel } from './EventTeamPanel';

vi.mock('../api/events.client', () => ({
  addEventMusician: vi.fn(),
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getEvent: vi.fn(),
  getEvents: vi.fn(),
  removeEventMusician: vi.fn(),
  updateEvent: vi.fn(),
  updateEventMusician: vi.fn(),
}));

import { updateEventMusician } from '../api/events.client';

function makeEvent(overrides: Partial<EventDetail> = {}): EventDetail {
  return {
    id: 'e1',
    name: 'Culto domingo',
    startsAt: '2026-10-18T14:00:00.000Z',
    endsAt: null,
    location: null,
    description: null,
    status: 'PENDING',
    setlist: null,
    attendance: { total: 2, confirmed: 1, pending: 1, declined: 0 },
    myAttendance: { musicianId: 'm2', status: 'PENDING' },
    updatedAt: '2026-10-01T00:00:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
    allowedStatusTransitions: ['DRAFT', 'CONFIRMED', 'CANCELLED'],
    musicians: [
      { id: 'm1', membershipId: 'ms1', userId: 'u1', name: 'Ana Martínez', email: 'ana@x.com', avatarUrl: null, role: 'LEADER', instrument: 'Voz', status: 'CONFIRMED', note: null },
      { id: 'm2', membershipId: 'ms2', userId: 'u2', name: 'Carlos Rodríguez', email: 'carlos@x.com', avatarUrl: null, role: 'MUSICIAN', instrument: 'Guitarra', status: 'PENDING', note: null },
    ],
    ...overrides,
  };
}

function renderPanel(props: { event?: EventDetail; currentUserId?: string; canManage?: boolean }) {
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return render(
    <EventTeamPanel event={props.event || makeEvent()} organizationId="org1" currentUserId={props.currentUserId} canManage={props.canManage ?? false} />,
    { wrapper },
  );
}

describe('EventTeamPanel', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.resetAllMocks();
  });

  it('un musico solo puede responder su propia asistencia', async () => {
    vi.mocked(updateEventMusician).mockResolvedValue(makeEvent());
    renderPanel({ currentUserId: 'u2' });

    expect(screen.queryByText('Agregar músico')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asistencia de Ana Martínez')).not.toBeInTheDocument();
    expect(screen.getByText('Confirmado')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Voy/ }));
    await waitFor(() => expect(updateEventMusician).toHaveBeenCalledWith('e1', 'm2', { status: 'CONFIRMED' }));
  });

  it('un lider puede agregar, quitar y cambiar la asistencia de otros', () => {
    renderPanel({ currentUserId: 'u1', canManage: true });

    expect(screen.getByRole('button', { name: /Agregar músico/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Asistencia de Carlos Rodríguez')).toBeInTheDocument();
    expect(screen.getByLabelText('Quitar a Carlos Rodríguez')).toBeInTheDocument();
  });

  it('un evento terminado queda en solo lectura', () => {
    renderPanel({ event: makeEvent({ status: 'FINISHED' }), currentUserId: 'u2', canManage: true });

    expect(screen.queryByRole('button', { name: /Agregar músico/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Voy/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Quitar a Ana Martínez')).not.toBeInTheDocument();
    expect(screen.getByText('Sin responder')).toBeInTheDocument();
  });
});
