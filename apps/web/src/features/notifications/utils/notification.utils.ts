/** "hace un momento", "hace 5 min", "hace 3 h", "ayer", "12 oct". */
export function formatNotificationTime(value: string, now = new Date()) {
  const date = new Date(value);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  if (hours < 48) return 'ayer';
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
}

/** "9+" cuando son muchos, para que el globito no crezca. */
export function formatUnreadBadge(count: number) {
  return count > 9 ? '9+' : String(count);
}
