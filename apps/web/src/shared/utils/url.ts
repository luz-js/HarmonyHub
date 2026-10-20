/**
 * Lee y quita una marca de la URL (`?nuevo=1`, `?stage=1`).
 * Los atajos del inicio la usan para abrir el formulario o el Stage Mode al llegar a la pagina.
 */
export function takeUrlFlag(name: string) {
  const params = new URLSearchParams(window.location.search);
  if (params.get(name) !== '1') return false;
  params.delete(name);
  const query = params.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  return true;
}
