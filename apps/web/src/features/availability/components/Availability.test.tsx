import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../../shared/api/query-client';
import type { EventDetail, MemberAvailability, TeamAvailability, Unavailability } from '../../../shared/types';
import { EventTeamPanel } from '../../events/components/EventTeamPanel';
import { formatDayRange, splitByToday, todayDay } from '../utils/availability.utils';
import { AvailabilityBadges } from './AvailabilityBadges';
import { UnavailabilitySection } from './UnavailabilitySection';

vi.mock('../api/availability.client', () => ({
  createMyUnavailability: vi.fn(),
  deleteMyUnavailability: vi.fn(),
  getEventAvailability: vi.fn(),
  getMyUnavailability: vi.fn(),
  getSetlistAvailability: vi.fn(),
}));

import { createMyUnavailability, deleteMyUnavailability, getEventAvailability, getMyUnavailability } from '../api/availability.client';

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

function row(id: string, startsOn: string, endsOn = startsOn, note: string | null = null): Unavailability {
  return { id, startsOn, endsOn, note, createdAt: '2026-10-01T00:00:00.000Z' };
}

function member(overrides: Partial<MemberAvailability> = {}): MemberAvailability {
  return { membershipId: 'ms1', userId: 'u1', name: 'Ana', unavailable: false, conflicts: [], ...overrides };
}

describe('UnavailabilitySection (Mi perfil > No disponible)', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.resetAllMocks();
  });

  it('lista las fechas próximas con su nota y deja las pasadas aparte', async () => {
    vi.mocked(getMyUnavailability).mockResolvedValue([row('a', '2020-01-01', '2020-01-02'), row('b', '2999-12-24', '2999-12-26', 'Viaje familiar')]);
    render(<UnavailabilitySection />, { wrapper });
    const upcoming = await screen.findByRole('list', { name: 'Fechas en que no estás disponible' });
    expect(within(upcoming).getByText('24 dic – 26 dic 2999')).toBeInTheDocument();
    expect(within(upcoming).getByText('Viaje familiar')).toBeInTheDocument();
    expect(screen.getByText('Fechas pasadas (1)')).toBeInTheDocument();
  });

  it('agregar un solo día: "hasta" vacío usa el mismo día; la nota es opcional', async () => {
    vi.mocked(getMyUnavailability).mockResolvedValue([]);
    vi.mocked(createMyUnavailability).mockResolvedValue(row('n', '2999-03-05'));
    render(<UnavailabilitySection />, { wrapper });
    expect(await screen.findByText(/No marcaste fechas próximas/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2999-03-05' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await waitFor(() => expect(createMyUnavailability).toHaveBeenCalledWith({ startsOn: '2999-03-05', endsOn: '2999-03-05', note: null }));
  });

  it('sin fecha "desde" muestra un error y no guarda; borrar quita la fecha', async () => {
    vi.mocked(getMyUnavailability).mockResolvedValue([row('b', '2999-12-24')]);
    vi.mocked(deleteMyUnavailability).mockResolvedValue({ ok: true });
    render(<UnavailabilitySection />, { wrapper });
    fireEvent.click(await screen.findByRole('button', { name: 'Agregar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Elige desde qué día no estás disponible.');
    expect(createMyUnavailability).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Borrar 24 dic 2999' }));
    await waitFor(() => expect(deleteMyUnavailability).toHaveBeenCalledWith('b'));
  });
});

describe('AvailabilityBadges', () => {
  it('no muestra nada si la persona está libre', () => {
    const { container } = render(<AvailabilityBadges availability={member()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('avisa "No disponible" y "Ya tiene otro evento" (con el nombre del otro evento)', () => {
    render(<AvailabilityBadges availability={member({ unavailable: true, conflicts: [{ eventId: 'e2', name: 'Boda Pérez', startsAt: '2026-11-03T20:00:00Z' }] })} />);
    expect(screen.getByText('No disponible')).toBeInTheDocument();
    expect(screen.getByText('Ya tiene otro evento')).toHaveAttribute('title', 'Boda Pérez');
  });
});

describe('EventTeamPanel con disponibilidad', () => {
  const event: EventDetail = {
    id: 'e1',
    name: 'Culto domingo',
    startsAt: '2026-11-03T14:00:00.000Z',
    endsAt: null,
    location: null,
    description: null,
    status: 'PENDING',
    setlist: null,
    attendance: { total: 1, confirmed: 0, pending: 1, declined: 0 },
    myAttendance: null,
    updatedAt: '2026-10-01T00:00:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
    allowedStatusTransitions: ['CONFIRMED', 'CANCELLED'],
    musicians: [{ id: 'm1', membershipId: 'ms1', userId: 'u1', name: 'Ana Martínez', email: 'ana@x.com', avatarUrl: null, role: 'MUSICIAN', instrument: null, instruments: [], status: 'PENDING', note: null }],
  };
  const availability: TeamAvailability = { event: null, members: [member({ unavailable: true })], suggestions: [] };

  beforeEach(() => {
    queryClient.clear();
    vi.resetAllMocks();
    vi.mocked(getEventAvailability).mockResolvedValue(availability);
  });

  it('quien arma el equipo ve el aviso junto al músico', async () => {
    render(<EventTeamPanel event={event} organizationId="org1" canManage />, { wrapper });
    expect(await screen.findByText('No disponible')).toBeInTheDocument();
    expect(getEventAvailability).toHaveBeenCalledWith('e1');
  });

  it('un músico no pide la disponibilidad del resto', () => {
    render(<EventTeamPanel event={event} organizationId="org1" canManage={false} />, { wrapper });
    expect(getEventAvailability).not.toHaveBeenCalled();
    expect(screen.queryByText('No disponible')).not.toBeInTheDocument();
  });
});

describe('availability.utils', () => {
  it('formatea rangos de días sin correrse por la zona horaria', () => {
    expect(formatDayRange('2026-12-24', '2026-12-24')).toBe('24 dic 2026');
    expect(formatDayRange('2026-12-24', '2026-12-26')).toBe('24 dic – 26 dic 2026');
    expect(formatDayRange('2026-12-30', '2027-01-02')).toBe('30 dic 2026 – 2 ene 2027');
  });

  it('hoy en el calendario local y separar próximas de pasadas', () => {
    expect(todayDay(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05');
    const { upcoming, past } = splitByToday([row('a', '2026-10-01', '2026-10-05'), row('b', '2026-10-01', '2026-10-04')], '2026-10-05');
    expect(upcoming.map((item) => item.id)).toEqual(['a']);
    expect(past.map((item) => item.id)).toEqual(['b']);
  });
});
