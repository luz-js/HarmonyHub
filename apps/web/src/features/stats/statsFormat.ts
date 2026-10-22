const DAY_MS = 24 * 60 * 60 * 1000;

export function formatStatsDate(value?: string | null) {
  if (!value) return 'Nunca';
  return new Date(value).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "hace 3 meses", "hace 12 días"... para fechas pasadas. */
export function sinceLabel(value?: string | null, now = new Date()) {
  if (!value) return 'Nunca';
  const days = Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / DAY_MS));
  if (days < 1) return 'hoy';
  if (days < 60) return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
  const months = Math.floor(days / 30);
  if (months < 24) return `hace ${months} meses`;
  return `hace ${Math.floor(months / 12)} años`;
}
