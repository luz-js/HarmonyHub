/** Saludo segun la hora local. */
export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** "Hace 5 min", "Hace 2 horas", "Ayer", "Hace 3 días" o la fecha si es mas antiguo que una semana. */
export function formatRelativeTime(iso: string, now = new Date()) {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? 'Hace 1 hora' : `Hace ${hours} horas`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function getInitials(name?: string | null) {
  if (!name) return '?';
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}
