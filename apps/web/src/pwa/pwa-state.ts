/**
 * Estado compartido de la app instalable: si hay conexion, si hay una version nueva lista y si el modo escenario
 * esta abierto (para no interrumpir con el aviso de version nueva en medio de una presentacion).
 * Son "stores" minimos para usar con useSyncExternalStore (ver hooks.ts).
 */

type Listener = () => void;

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set(next: T) {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// ---- Conexion ----

export function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

export function subscribeToConnection(listener: Listener) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

// ---- Version nueva ----

const updateStore = createStore<(() => void) | null>(null);
export const updateState = { get: updateStore.get, subscribe: updateStore.subscribe };

/** El service worker nuevo ya esta descargado: `apply` lo activa y recarga la pagina. */
export function markUpdateReady(apply: () => void) {
  updateStore.set(apply);
}

export function applyUpdate() {
  updateStore.get()?.();
}

// ---- Modo escenario ----

const stageStore = createStore(0);
export const stageModeState = { get: () => stageStore.get() > 0, subscribe: stageStore.subscribe };

/** El modo escenario lo llama al abrirse; la funcion que devuelve lo marca como cerrado. */
export function enterStageMode() {
  stageStore.set(stageStore.get() + 1);
  let left = false;
  return () => {
    if (left) return;
    left = true;
    stageStore.set(stageStore.get() - 1);
  };
}
