import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../shared/api/query-client';
import type { MemberLoadStats, RepertoireStats } from '../../shared/types';

vi.mock('../../shared/api/api-client', () => ({ getRepertoireStats: vi.fn(), getMemberLoadStats: vi.fn() }));
vi.mock('../../shared/api/http', () => ({ getCurrentOrganizationId: () => 'o1' }));

import { getMemberLoadStats, getRepertoireStats } from '../../shared/api/api-client';
import { StatsPage } from './StatsPage';

const period = { months: 6, from: '2026-04-22T12:00:00.000Z', to: '2026-10-22T12:00:00.000Z' };
const repertoire: RepertoireStats = {
  period,
  rules: { playedEventStatuses: ['CONFIRMED', 'FINISHED'], forgottenMonths: 6 },
  totals: { eventsPlayed: 4, songsPlayed: 2, activeSongs: 3 },
  topSongs: [
    { songId: 's1', title: 'Sublime gracia', artist: 'Newton', timesPlayed: 3, lastPlayedAt: '2026-10-11T14:00:00.000Z' },
    { songId: 's2', title: 'Cuán grande', artist: 'Hine', timesPlayed: 1, lastPlayedAt: '2026-09-01T14:00:00.000Z' },
  ],
  lastPlayed: [{ songId: 's1', title: 'Sublime gracia', artist: 'Newton', timesPlayed: 3, lastPlayedAt: '2026-10-11T14:00:00.000Z' }],
  forgotten: [{ songId: 's9', title: 'Vieja canción', artist: 'Anon', timesPlayed: 0, lastPlayedAt: '2025-12-01T14:00:00.000Z' }],
  neverPlayed: [{ songId: 's3', title: 'Nueva', artist: 'Equipo' }],
  keys: [{ key: 'G', timesPlayed: 3 }, { key: 'D', timesPlayed: 1 }],
};
const emptyRepertoire: RepertoireStats = { ...repertoire, totals: { eventsPlayed: 0, songsPlayed: 0, activeSongs: 0 }, topSongs: [], lastPlayed: [], forgotten: [], neverPlayed: [], keys: [] };
const members: MemberLoadStats = {
  period,
  thresholds: { overloadedUpcomingEvents: 4, overloadedWindowDays: 30, idleDays: 60 },
  members: [
    { membershipId: 'm1', userId: 'u1', name: 'Ana Martínez', avatarUrl: null, role: 'MUSICIAN', inTeam: 6, confirmed: 5, declined: 1, upcoming: 4, nextEventAt: '2026-10-25T14:00:00.000Z', lastServiceAt: '2026-10-18T14:00:00.000Z', unavailableDaysNext30: 2, overloaded: true, idle: false },
    { membershipId: 'm2', userId: 'u2', name: 'Beto Ruiz', avatarUrl: null, role: 'MUSICIAN', inTeam: 0, confirmed: 0, declined: 0, upcoming: 0, nextEventAt: null, lastServiceAt: null, unavailableDaysNext30: 0, overloaded: false, idle: true },
  ],
};

const navigate = vi.fn();
const defaults = queryClient.getDefaultOptions().queries;

async function renderPage(role: string) {
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <StatsPage navigate={navigate} role={role} />
      </QueryClientProvider>,
    );
  });
}

beforeEach(() => {
  queryClient.clear();
  queryClient.setDefaultOptions({ queries: { ...defaults, retry: false } });
  vi.mocked(getRepertoireStats).mockResolvedValue(repertoire);
  vi.mocked(getMemberLoadStats).mockResolvedValue(members);
});
afterEach(() => {
  vi.clearAllMocks();
  queryClient.setDefaultOptions({ queries: defaults });
});

describe('StatsPage', () => {
  it('repertorio: totales, mas tocadas, tonalidades, olvidadas y nunca tocadas (6 meses por defecto)', async () => {
    await renderPage('MUSICIAN');
    expect(getRepertoireStats).toHaveBeenCalledWith(6);
    expect(screen.getByRole('radio', { name: '6 meses' })).toHaveAttribute('aria-checked', 'true');
    expect((await screen.findByText('Canciones distintas tocadas')).previousSibling).toHaveTextContent('2');

    const top = screen.getByRole('region', { name: 'Más tocadas' });
    expect(within(top).getAllByRole('listitem').map((row) => row.textContent)).toEqual(['Sublime graciaNewton3 veces', 'Cuán grandeHine1 vez']);
    expect(within(screen.getByRole('region', { name: 'Tonalidades' })).getByText('G')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Olvidadas' })).getByText('Vieja canción')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Olvidadas' })).getByText(/no en los últimos 6 meses/)).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('region', { name: 'Nunca tocadas' })).getByRole('button', { name: /Nueva/ }));
    expect(navigate).toHaveBeenCalledWith('/songs/s3');
  });

  it('cambiar el periodo vuelve a pedir con 3 o 12 meses', async () => {
    await renderPage('MUSICIAN');
    await act(async () => fireEvent.click(screen.getByRole('radio', { name: '12 meses' })));
    expect(getRepertoireStats).toHaveBeenLastCalledWith(12);
    expect(screen.getByRole('radio', { name: '12 meses' })).toHaveAttribute('aria-checked', 'true');
    await act(async () => fireEvent.click(screen.getByRole('radio', { name: '3 meses' })));
    expect(getRepertoireStats).toHaveBeenLastCalledWith(3);
  });

  it('estados vacios con textos claros', async () => {
    vi.mocked(getRepertoireStats).mockResolvedValue(emptyRepertoire);
    await renderPage('MUSICIAN');
    expect(await screen.findByText('No se tocó ninguna canción en este periodo.')).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay datos de tonalidades.')).toBeInTheDocument();
    expect(screen.getByText(/Ninguna: todo lo que se tocó/)).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay eventos hechos con setlist.')).toBeInTheDocument();
  });

  it('musicos e invitados no ven ni piden la carga por musico', async () => {
    await renderPage('GUEST');
    expect(screen.queryByRole('tab', { name: /Carga por músico/ })).not.toBeInTheDocument();
    expect(getMemberLoadStats).not.toHaveBeenCalled();
  });

  it('quien arma equipos ve la carga por musico con los umbrales explicados', async () => {
    await renderPage('LEADER');
    expect(getMemberLoadStats).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: /Carga por músico/ })));
    expect(getMemberLoadStats).toHaveBeenCalledWith(6);
    expect(await screen.findByText(/4 o más eventos en los próximos 30 días/)).toBeInTheDocument();
    expect(screen.getByText(/en los últimos 60 días/)).toBeInTheDocument();

    const ana = screen.getByRole('listitem', { name: 'Ana Martínez' });
    expect(within(ana).getByText('Sobrecargado')).toBeInTheDocument();
    expect(within(ana).queryByText('Sin servicio hace tiempo')).not.toBeInTheDocument();
    expect(within(ana).getByText(/No disponible 2 días/)).toBeInTheDocument();
    const beto = screen.getByRole('listitem', { name: 'Beto Ruiz' });
    expect(within(beto).getByText('Sin servicio hace tiempo')).toBeInTheDocument();
    expect(within(beto).getByText(/Último servicio: nunca/)).toBeInTheDocument();
  });

  it('si falla muestra el error', async () => {
    vi.mocked(getRepertoireStats).mockRejectedValue(new Error('No tienes permiso para hacer esto'));
    await renderPage('MUSICIAN');
    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso');
  });
});
