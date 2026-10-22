const PREFIX = '/compartido/';

/** "/compartido/<token>" -> el token; cualquier otra ruta -> null. Esta pagina se abre con o sin sesion. */
export function sharedSetlistToken(path: string) {
  if (!path.startsWith(PREFIX)) return null;
  const token = path.slice(PREFIX.length).split(/[/?#]/)[0];
  return token || null;
}
