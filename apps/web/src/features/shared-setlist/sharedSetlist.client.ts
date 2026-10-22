import type { SharedSetlist } from '../../shared/types';

export class SharedSetlistError extends Error {
  constructor(readonly status: number) {
    super(status === 429 ? 'Demasiadas solicitudes. Espera unos minutos e intenta de nuevo.' : 'Este enlace no existe o ya no está disponible.');
  }
}

/**
 * La pagina publica pide el setlist sin la sesion de quien la abre (sin cookies ni token ni organizacion): el
 * token del enlace es la unica llave, y la respuesta no se guarda en ninguna cache.
 */
export async function getSharedSetlist(token: string, fetcher: typeof fetch = fetch): Promise<SharedSetlist> {
  const response = await fetcher(`/api/public/shared-setlists/${encodeURIComponent(token)}`, {
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) throw new SharedSetlistError(response.status);
  return (await response.json()) as SharedSetlist;
}
