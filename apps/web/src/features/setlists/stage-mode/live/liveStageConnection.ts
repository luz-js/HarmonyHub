import type { LiveStageState } from '../../../../shared/types';
import { openAuthorizedStream } from '../../../../shared/api/http';

/** en vivo (conectado), conectando / reconectando, sin conexion (el modo escenario sigue local), o sin acceso. */
export type LiveConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'offline' | 'unavailable';

/** Esperas entre reintentos (la ultima se repite). */
export const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000];
/** Si no llega nada (ni el "ping" del servidor) en este tiempo, la conexion se da por muerta y se reabre. */
export const SILENCE_TIMEOUT_MS = 45_000;

/**
 * Separa los mensajes completos de un stream SSE (bloques terminados en linea en blanco). Devuelve los estados
 * recibidos y lo que sobra (un mensaje a medias, que se completa con el siguiente pedazo). Ignora los comentarios
 * (": ping") y los eventos que no son "state".
 */
export function parseSseChunk(buffer: string): { states: LiveStageState[]; rest: string } {
  const states: LiveStageState[] = [];
  const normalized = buffer.replace(/\r\n/g, '\n');
  const blocks = normalized.split('\n\n');
  const rest = blocks.pop() ?? '';
  for (const block of blocks) {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith(':')) continue;
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    }
    if (event !== 'state' || data.length === 0) continue;
    try {
      states.push(JSON.parse(data.join('\n')) as LiveStageState);
    } catch {
      // Un mensaje roto no corta la conexion.
    }
  }
  return { states, rest };
}

type Handlers = { onState: (state: LiveStageState) => void; onStatus: (status: LiveConnectionStatus) => void };

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/**
 * Se conecta al stream del setlist y se reconecta solo (al volver, el servidor manda el estado actual).
 * Devuelve una funcion para desconectar.
 */
export function connectLiveStage(setlistId: string, { onState, onStatus }: Handlers, open = openAuthorizedStream) {
  let stopped = false;
  let attempt = 0;
  let controller: AbortController | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleRetry = () => {
    if (stopped) return;
    if (isOffline()) {
      onStatus('offline');
      window.addEventListener('online', retryNow, { once: true });
      return;
    }
    onStatus('reconnecting');
    const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
    attempt++;
    retryTimer = setTimeout(run, delay);
  };

  function retryNow() {
    if (stopped) return;
    attempt = 0;
    void run();
  }

  async function run() {
    if (stopped) return;
    controller = new AbortController();
    const current = controller;
    let silence: ReturnType<typeof setTimeout> | null = null;
    const resetSilence = () => {
      if (silence) clearTimeout(silence);
      silence = setTimeout(() => current.abort(), SILENCE_TIMEOUT_MS);
    };
    try {
      const response = await open(`/api/setlists/${encodeURIComponent(setlistId)}/live/stream`, current.signal);
      if (response.status === 403 || response.status === 404) {
        onStatus('unavailable');
        return;
      }
      if (!response.ok || !response.body) throw new Error(`stream ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      resetSilence();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        resetSilence();
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseChunk(buffer);
        buffer = parsed.rest;
        for (const state of parsed.states) {
          attempt = 0;
          onStatus('live');
          onState(state);
        }
      }
    } catch {
      // Error de red o conexion abortada: se reintenta abajo.
    } finally {
      if (silence) clearTimeout(silence);
    }
    scheduleRetry();
  }

  onStatus(isOffline() ? 'offline' : 'connecting');
  if (isOffline()) window.addEventListener('online', retryNow, { once: true });
  else void run();

  return () => {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
    window.removeEventListener('online', retryNow);
    controller?.abort();
  };
}
