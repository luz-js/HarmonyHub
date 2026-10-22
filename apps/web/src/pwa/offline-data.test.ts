import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_CACHE, FILES_CACHE } from './cache-rules';
import { clearOfflineData, syncOfflineDataOwner } from './offline-data';

function fakeCaches() {
  return { delete: vi.fn(async (_name: string) => true) };
}

describe('datos guardados sin conexion: privacidad', () => {
  beforeEach(() => localStorage.clear());

  it('al cerrar sesion se borran las caches con datos (la app en si queda)', async () => {
    const storage = fakeCaches();
    await clearOfflineData(storage);
    expect(storage.delete.mock.calls.map(([name]) => name).sort()).toEqual([API_CACHE, FILES_CACHE].sort());
  });

  it('si entra otra persona en el mismo navegador, se borra lo de la anterior', async () => {
    const storage = fakeCaches();
    await syncOfflineDataOwner('ana', storage);
    expect(storage.delete).not.toHaveBeenCalled();

    await syncOfflineDataOwner('ana', storage);
    expect(storage.delete).not.toHaveBeenCalled();

    await syncOfflineDataOwner('beto', storage);
    expect(storage.delete).toHaveBeenCalledTimes(2);
  });

  it('sin sesion tambien se borra y se olvida al dueno; sin Cache API no falla', async () => {
    const storage = fakeCaches();
    await syncOfflineDataOwner('ana', storage);
    await syncOfflineDataOwner(null, storage);
    expect(storage.delete).toHaveBeenCalledTimes(2);
    await syncOfflineDataOwner('beto', storage);
    expect(storage.delete).toHaveBeenCalledTimes(2);
    await expect(clearOfflineData(null)).resolves.toBeUndefined();
  });
});
