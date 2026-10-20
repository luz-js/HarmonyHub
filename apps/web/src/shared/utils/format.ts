export function formatDuration(seconds?: number | null) {
  if (!seconds) return '—';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatBpm(bpm?: number | null) {
  return bpm ? `${bpm} BPM` : '—';
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-ES');
}

export function formatKey(value?: string | null) {
  return value || '—';
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  LEADER: 'Líder',
  MUSICIAN: 'Músico',
  GUEST: 'Invitado',
};

/** Rol de membresia en español (OWNER -> Propietario). */
export function formatRole(role?: string | null) {
  return role ? ROLE_LABELS[role] || role : '';
}

/** "1 canción", "3 canciones": elige la forma segun la cantidad. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
