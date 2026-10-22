import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../../../shared/api/query-client';
import type { LiveStageState } from '../../../../shared/types';
import { LiveConnectionIndicator, LiveStageBar } from './LiveStageBar';
import { connectLiveStage, parseSseChunk, RECONNECT_DELAYS_MS, type LiveConnectionStatus } from './liveStageConnection';
import { useLiveStage } from './useLiveStage';

vi.mock('./liveStageApi', () => ({
  advanceLiveStage: vi.fn(),
  endLiveStage: vi.fn(),
  getLiveStage: vi.fn(),
  handoverLiveStage: vi.fn(),
  startLiveStage: vi.fn(),
}));
vi.mock('../../../musicians/hooks', () => ({ useMemberships: () => ({ data: [] }) }));

import { advanceLiveStage, startLiveStage } from './liveStageApi';

const leader = { userId: 'u-lider', membershipId: 'm-lider', name: 'Ana' };
function liveState(currentItemId: string, version: number, who = leader): LiveStageState {
  return { live: true, setlistId: 's1', leader: who, currentItemId, version, startedAt: '2026-10-22T20:00:00Z', updatedAt: '2026-10-22T20:00:00Z' };
}

describe('parseSseChunk', () => {
  it('separa mensajes completos, ignora pings y otros eventos, y guarda lo que llega a medias', () => {
    const chunk = `: ping\n\nevent: state\ndata: ${JSON.stringify({ live: false, setlistId: 's1' })}\n\nevent: otro\ndata: {}\n\nevent: state\r\ndata: {"live":tr`;
    const { states, rest } = parseSseChunk(chunk);
    expect(states).toEqual([{ live: false, setlistId: 's1' }]);
    expect(rest).toBe('event: state\ndata: {"live":tr');
    expect(parseSseChunk('event: state\ndata: {roto\n\n').states).toEqual([]);
  });
});

describe('connectLiveStage: reconexion', () => {
  let online = true;
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => online });

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    online = true;
  });

  function streamResponse(chunks: string[], status = 200) {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    });
    return new Response(status === 200 ? body : null, { status });
  }

  it('recibe el estado, y si la conexion se corta, se reconecta sola', async () => {
    const statuses: LiveConnectionStatus[] = [];
    const states: LiveStageState[] = [];
    const open = vi.fn(async () => streamResponse([`event: state\ndata: ${JSON.stringify(liveState('i1', 1))}\n\n`]));
    const stop = connectLiveStage('s1', { onState: (s) => states.push(s), onStatus: (s) => statuses.push(s) }, open);
    await vi.advanceTimersByTimeAsync(0);
    expect(states).toHaveLength(1);
    expect(statuses).toEqual(['connecting', 'live', 'reconnecting']);
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAYS_MS[0]);
    expect(open).toHaveBeenCalledTimes(2);
    stop();
  });

  it('sin acceso (403/404) no insiste; sin conexion espera a que vuelva la red', async () => {
    const statuses: LiveConnectionStatus[] = [];
    const denied = vi.fn(async () => streamResponse([], 404));
    connectLiveStage('s1', { onState: () => {}, onStatus: (s) => statuses.push(s) }, denied)();
    await vi.advanceTimersByTimeAsync(0);
    expect(statuses.at(-1)).toBe('unavailable');

    online = false;
    const offlineStatuses: LiveConnectionStatus[] = [];
    const open = vi.fn(async () => streamResponse([`event: state\ndata: ${JSON.stringify(liveState('i1', 1))}\n\n`]));
    const stop = connectLiveStage('s1', { onState: () => {}, onStatus: (s) => offlineStatuses.push(s) }, open);
    expect(offlineStatuses).toEqual(['offline']);
    expect(open).not.toHaveBeenCalled();
    online = true;
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(open).toHaveBeenCalledTimes(1);
    expect(offlineStatuses).toContain('live');
    stop();
  });
});

describe('useLiveStage: seguir al lider', () => {
  let emit: (state: LiveStageState) => void = () => {};
  const fakeConnect = ((_setlistId: string, handlers: { onState: (state: LiveStageState) => void; onStatus: (status: LiveConnectionStatus) => void }) => {
    emit = handlers.onState;
    handlers.onStatus('live');
    return () => {};
  }) as typeof connectLiveStage;

  beforeEach(() => {
    vi.mocked(advanceLiveStage).mockReset();
    vi.mocked(startLiveStage).mockReset();
  });

  function setup(props: { currentUserId: string; canLead?: boolean }) {
    const goToItem = vi.fn();
    const hook = renderHook(({ currentItemId }) => useLiveStage({ setlistId: 's1', currentUserId: props.currentUserId, currentItemId, goToItem, canLead: props.canLead ?? false, connect: fakeConnect }), {
      initialProps: { currentItemId: 'i1' as string | null },
    });
    return { ...hook, goToItem };
  }

  it('sigue al lider, deja de seguir si navega a mano y "Volver con el lider" lo reactiva', () => {
    const { result, rerender, goToItem } = setup({ currentUserId: 'u-musico' });
    act(() => emit(liveState('i2', 1)));
    expect(goToItem).toHaveBeenLastCalledWith('i2');
    rerender({ currentItemId: 'i2' });
    expect(result.current.following).toBe(true);

    rerender({ currentItemId: 'i5' }); // navego a mano
    expect(result.current.following).toBe(false);
    act(() => emit(liveState('i3', 2)));
    expect(goToItem).toHaveBeenCalledTimes(1);

    act(() => result.current.backToLeader());
    expect(goToItem).toHaveBeenLastCalledWith('i3');
    act(() => emit(liveState('i2', 1))); // un mensaje viejo no hace retroceder
    expect(result.current.live.live && result.current.live.currentItemId).toBe('i3');
  });

  it('quien dirige avisa cada cambio de item; si otro dirige, 409 ofrece tomar el liderazgo', async () => {
    vi.mocked(advanceLiveStage).mockResolvedValue(liveState('i2', 2));
    const { result, rerender } = setup({ currentUserId: leader.userId, canLead: true });
    act(() => emit(liveState('i1', 1)));
    expect(result.current.isLeader).toBe(true);
    rerender({ currentItemId: 'i2' });
    expect(advanceLiveStage).toHaveBeenCalledWith('s1', { currentItemId: 'i2' });

    const other = setup({ currentUserId: 'u-beto', canLead: true });
    vi.mocked(startLiveStage).mockRejectedValueOnce(Object.assign(new Error('Ana ya esta dirigiendo'), { status: 409, body: { leader } }));
    await act(() => other.result.current.start());
    expect(other.result.current.conflict).toEqual(leader);
    vi.mocked(startLiveStage).mockResolvedValueOnce(liveState('i1', 3, { userId: 'u-beto', membershipId: 'm-beto', name: 'Beto' }));
    await act(() => other.result.current.takeOver());
    expect(startLiveStage).toHaveBeenLastCalledWith('s1', { takeOver: true, currentItemId: 'i1' });
    expect(other.result.current.conflict).toBeNull();
  });
});

describe('LiveStageBar', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  type Live = Parameters<typeof LiveStageBar>[0]['live'];
  const base = (overrides: Partial<Live> = {}): Live =>
    ({
      live: liveState('i1', 1),
      status: 'live',
      isLeader: false,
      following: true,
      conflict: null,
      error: '',
      busy: false,
      canLead: false,
      start: vi.fn(),
      takeOver: vi.fn(),
      handover: vi.fn(),
      end: vi.fn(),
      setFollowing: vi.fn(),
      backToLeader: vi.fn(),
      dismissConflict: vi.fn(),
      ...overrides,
    }) as Live;

  it('indicador de conexion: conectado, reconectando y sin conexion', () => {
    const { rerender } = render(<LiveConnectionIndicator status="live" />);
    expect(screen.getByRole('status')).toHaveTextContent('Conectado');
    rerender(<LiveConnectionIndicator status="reconnecting" />);
    expect(screen.getByRole('status')).toHaveTextContent('Reconectando…');
    rerender(<LiveConnectionIndicator status="offline" />);
    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión');
  });

  it('quien sigue ve "En vivo", quien dirige y el interruptor; al apagarlo aparece "Volver con el líder"', () => {
    const live = base();
    const { rerender } = render(<LiveStageBar live={live} organizationId="org" />, { wrapper });
    expect(screen.getByText('Dirige Ana')).toBeInTheDocument();
    const toggle = screen.getByRole('switch', { name: 'Seguir al líder' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(live.setFollowing).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('button', { name: 'Volver con el líder' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dirigir yo' })).not.toBeInTheDocument();

    const notFollowing = base({ following: false });
    rerender(<LiveStageBar live={notFollowing} organizationId="org" />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver con el líder' }));
    expect(notFollowing.backToLeader).toHaveBeenCalled();
  });

  it('quien dirige ve "Terminar"; sin sesion, quien puede dirigir ve "Iniciar en vivo"; el 409 ofrece tomar el liderazgo', () => {
    const leading = base({ isLeader: true, canLead: true });
    const { rerender } = render(<LiveStageBar live={leading} organizationId="org" />, { wrapper });
    expect(screen.getByText('Diriges tú')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Terminar en vivo' }));
    expect(leading.end).toHaveBeenCalled();

    const idle = base({ live: { live: false, setlistId: 's1' }, canLead: true });
    rerender(<LiveStageBar live={idle} organizationId="org" />);
    fireEvent.click(screen.getByRole('button', { name: /Iniciar en vivo/ }));
    expect(idle.start).toHaveBeenCalled();

    const conflicted = base({ live: { live: false, setlistId: 's1' }, canLead: true, conflict: leader });
    rerender(<LiveStageBar live={conflicted} organizationId="org" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Ana ya está dirigiendo.');
    fireEvent.click(screen.getByRole('button', { name: 'Tomar el liderazgo' }));
    expect(conflicted.takeOver).toHaveBeenCalled();
  });
});
