/** Direccion de la pagina publica de un setlist compartido (la abre cualquiera con el enlace, sin cuenta). */
export function sharedSetlistUrl(token: string, origin = window.location.origin) {
  return `${origin}/compartido/${token}`;
}
