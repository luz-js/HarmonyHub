import { PERSONAL_DATA_CACHES } from './cache-rules';

/** Quien era el dueno de lo guardado para usar sin conexion (para borrarlo si entra otra persona). */
const OWNER_KEY = 'hh_offline_cache_owner';

type CacheStorageLike = Pick<CacheStorage, 'delete'>;

function browserCaches(): CacheStorageLike | null {
  return typeof caches === 'undefined' ? null : caches;
}

/** Borra las canciones, setlists, eventos y archivos guardados para usar sin conexion. La app en si queda guardada. */
export async function clearOfflineData(storage: CacheStorageLike | null = browserCaches()) {
  if (!storage) return;
  await Promise.all(PERSONAL_DATA_CACHES.map((name) => storage.delete(name).catch(() => false)));
}

/**
 * Llamar cuando cambia la persona de la sesion: si lo guardado era de otra persona, se borra antes de seguir.
 * Con `null` (sin sesion) tambien se borra y se olvida al dueno: cubre una sesion que termino con la app cerrada.
 */
export async function syncOfflineDataOwner(userId: string | null, storage: CacheStorageLike | null = browserCaches()) {
  let previous: string | null = null;
  try {
    previous = localStorage.getItem(OWNER_KEY);
  } catch {
    previous = null;
  }
  if (previous && previous !== userId) await clearOfflineData(storage);
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    // Sin localStorage (modo privado estricto) no hay como recordar al dueno; no es un error.
  }
}
