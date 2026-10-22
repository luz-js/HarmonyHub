/** Paginas que muestran datos de una organizacion: sin organizacion activa no se piden a la API. */
const ORGANIZATION_PAGES: Array<{ prefix: string; label: string }> = [
  { prefix: '/songs', label: 'Canciones' },
  { prefix: '/setlists', label: 'Setlists' },
  { prefix: '/events', label: 'Eventos' },
  { prefix: '/calendar', label: 'Calendario' },
  { prefix: '/musicians', label: 'Músicos' },
  { prefix: '/archives', label: 'Archivos' },
  { prefix: '/activity', label: 'Actividad' },
  { prefix: '/stats', label: 'Estadísticas' },
  { prefix: '/settings', label: 'Ajustes' },
];

/** La pagina de organizacion que corresponde a la ruta (o null si la ruta no necesita una organizacion). */
export function organizationPageFor(path: string) {
  return ORGANIZATION_PAGES.find((page) => path === page.prefix || path.startsWith(`${page.prefix}/`)) ?? null;
}
