export function formatDuration(seconds?: number | null) {
  if (!seconds) return '-';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatBpm(bpm?: number | null) {
  return bpm ? `${bpm} BPM` : '-';
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-ES');
}

export function formatKey(value?: string | null) {
  return value || '-';
}
