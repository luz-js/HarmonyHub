import { useEffect, useSyncExternalStore } from 'react';
import { enterStageMode, isOnline, stageModeState, subscribeToConnection, updateState } from './pwa-state';

/** true con conexion, false sin conexion (se actualiza solo al perderla o recuperarla). */
export function useOnlineStatus() {
  return useSyncExternalStore(subscribeToConnection, isOnline, () => true);
}

/** Hay una version nueva de la app lista para activarse. */
export function useUpdateAvailable() {
  return useSyncExternalStore(updateState.subscribe, () => updateState.get() !== null, () => false);
}

export function useStageModeOpen() {
  return useSyncExternalStore(stageModeState.subscribe, stageModeState.get, () => false);
}

/** Lo usa el modo escenario: mientras esta montado, el aviso de version nueva espera. */
export function useMarkStageModeOpen() {
  useEffect(() => enterStageMode(), []);
}
