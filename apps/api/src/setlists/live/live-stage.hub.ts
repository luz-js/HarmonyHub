import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { LiveStageLeader, LiveStageState } from '@harmonyhub/contracts';

/**
 * Modo escenario en vivo, en memoria de este proceso: una sesion por setlist (y organizacion), con un solo lider,
 * y la lista de dispositivos conectados a los que se les avisa cada cambio. No guarda nada en la base: si la API
 * se reinicia, las sesiones se pierden y el lider la vuelve a iniciar. Con varias instancias de la API haria falta
 * un canal compartido (por ejemplo Redis pub/sub) en lugar de este Map.
 */

type Session = Extract<LiveStageState, { live: true }> & { organizationId: string };
export type LiveSubscriber = { send: (state: LiveStageState) => void; close: () => void };

export class LiveStageError extends Error {
  constructor(
    readonly code: 'NOT_LIVE' | 'NOT_LEADER' | 'CONFLICT',
    message: string,
    readonly leader?: LiveStageLeader,
  ) {
    super(message);
  }
}

const keyOf = (organizationId: string, setlistId: string) => `${organizationId}:${setlistId}`;

@Injectable()
export class LiveStageHub implements OnModuleDestroy {
  private readonly sessions = new Map<string, Session>();
  private readonly subscribers = new Map<string, Set<LiveSubscriber>>();

  /** Reloj (las pruebas lo reemplazan). */
  now: () => Date = () => new Date();

  /** Lo que ve un dispositivo al conectarse o al consultar. */
  state(organizationId: string, setlistId: string): LiveStageState {
    const session = this.sessions.get(keyOf(organizationId, setlistId));
    if (!session) return { live: false, setlistId };
    const { organizationId: _organizationId, ...visible } = session;
    return visible;
  }

  /**
   * Inicia la sesion (queda como lider). Si ya la dirige otra persona: error CONFLICT con quien dirige, salvo que
   * se pida `takeOver`. Si ya la dirige esta misma persona, devuelve la sesion tal cual (sin reiniciarla).
   */
  start(organizationId: string, setlistId: string, leader: LiveStageLeader, options: { takeOver?: boolean; currentItemId?: string | null } = {}) {
    const key = keyOf(organizationId, setlistId);
    const current = this.sessions.get(key);
    if (current && current.leader.userId === leader.userId) return this.state(organizationId, setlistId);
    if (current && !options.takeOver) {
      throw new LiveStageError('CONFLICT', `${current.leader.name} ya esta dirigiendo este setlist en vivo`, current.leader);
    }
    const stamp = this.now().toISOString();
    this.sessions.set(key, {
      live: true,
      organizationId,
      setlistId,
      leader,
      currentItemId: options.currentItemId ?? current?.currentItemId ?? null,
      version: (current?.version ?? 0) + 1,
      startedAt: current?.startedAt ?? stamp,
      updatedAt: stamp,
    });
    return this.broadcast(organizationId, setlistId);
  }

  advance(organizationId: string, setlistId: string, userId: string, currentItemId: string) {
    const session = this.leaderSession(organizationId, setlistId, userId);
    if (session.currentItemId === currentItemId) return this.state(organizationId, setlistId);
    this.touch(session, { currentItemId });
    return this.broadcast(organizationId, setlistId);
  }

  handover(organizationId: string, setlistId: string, userId: string, nextLeader: LiveStageLeader) {
    const session = this.leaderSession(organizationId, setlistId, userId);
    this.touch(session, { leader: nextLeader });
    return this.broadcast(organizationId, setlistId);
  }

  end(organizationId: string, setlistId: string, userId: string) {
    this.leaderSession(organizationId, setlistId, userId);
    this.sessions.delete(keyOf(organizationId, setlistId));
    return this.broadcast(organizationId, setlistId);
  }

  /** Conecta un dispositivo: recibe el estado actual al momento y despues cada cambio. Devuelve como desconectarlo. */
  subscribe(organizationId: string, setlistId: string, subscriber: LiveSubscriber) {
    const key = keyOf(organizationId, setlistId);
    const set = this.subscribers.get(key) ?? new Set<LiveSubscriber>();
    set.add(subscriber);
    this.subscribers.set(key, set);
    subscriber.send(this.state(organizationId, setlistId));
    return () => {
      set.delete(subscriber);
      if (set.size === 0) this.subscribers.delete(key);
    };
  }

  subscriberCount(organizationId: string, setlistId: string) {
    return this.subscribers.get(keyOf(organizationId, setlistId))?.size ?? 0;
  }

  /** Al apagar la API se cierran los streams abiertos (si no, el servidor esperaria para siempre). */
  onModuleDestroy() {
    for (const set of this.subscribers.values()) for (const subscriber of set) subscriber.close();
    this.subscribers.clear();
    this.sessions.clear();
  }

  private leaderSession(organizationId: string, setlistId: string, userId: string) {
    const session = this.sessions.get(keyOf(organizationId, setlistId));
    if (!session) throw new LiveStageError('NOT_LIVE', 'Este setlist no esta en vivo');
    if (session.leader.userId !== userId) throw new LiveStageError('NOT_LEADER', 'Solo quien dirige puede hacer esto', session.leader);
    return session;
  }

  private touch(session: Session, changes: Partial<Pick<Session, 'currentItemId' | 'leader'>>) {
    Object.assign(session, changes, { version: session.version + 1, updatedAt: this.now().toISOString() });
  }

  private broadcast(organizationId: string, setlistId: string) {
    const state = this.state(organizationId, setlistId);
    for (const subscriber of this.subscribers.get(keyOf(organizationId, setlistId)) ?? []) {
      try {
        subscriber.send(state);
      } catch {
        // Un dispositivo que ya se fue no debe cortar el aviso a los demas.
      }
    }
    return state;
  }
}
