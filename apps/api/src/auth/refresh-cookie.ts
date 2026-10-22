import type { IssuedRefreshToken } from './refresh-token.service';

/** Lo minimo de la respuesta/peticion de Express que se usa aqui (sin depender de @types/express). */
type CookieOptions = { httpOnly: boolean; sameSite: 'lax'; secure: boolean; path: string; expires?: Date };
export type CookieResponse = { cookie(name: string, value: string, options: CookieOptions): unknown; clearCookie(name: string, options: CookieOptions): unknown };
export type CookieRequest = { headers: { cookie?: string; 'user-agent'?: string } };

/** El refresh token viaja solo en esta cookie: httpOnly (JavaScript no la ve) y limitada a /api/auth. */
export const REFRESH_COOKIE_NAME = 'hh_refresh';
const REFRESH_COOKIE_PATH = '/api/auth';

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    // En produccion (HTTPS) la cookie solo viaja cifrada; en desarrollo local se permite HTTP.
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
    path: REFRESH_COOKIE_PATH,
  };
}

export function setRefreshCookie(response: CookieResponse, refresh: IssuedRefreshToken) {
  response.cookie(REFRESH_COOKIE_NAME, refresh.token, { ...cookieOptions(), expires: refresh.expiresAt });
}

export function clearRefreshCookie(response: CookieResponse) {
  response.clearCookie(REFRESH_COOKIE_NAME, cookieOptions());
}

/** Lee la cookie sin depender de cookie-parser. */
export function readRefreshCookie(request: CookieRequest) {
  const header = request.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === REFRESH_COOKIE_NAME) return decodeURIComponent(rest.join('='));
  }
  return null;
}
