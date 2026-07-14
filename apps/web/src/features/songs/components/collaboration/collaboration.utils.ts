import type { SongCommentTarget, SongCommentThread } from '../../../../shared/types';

export const threadTargetLabels: Record<SongCommentTarget, string> = {
  SONG: 'Canción',
  VERSION: 'Versión',
  SECTION: 'Sección',
  TRACK: 'Pista',
  FILE: 'Archivo',
  LINK: 'Referencia',
};

export function threadContextLabel(thread: SongCommentThread, sectionName?: string) {
  if (thread.targetType === 'SECTION') return `Sección${sectionName ? ` · ${sectionName}` : ''}`;
  if (thread.targetType === 'VERSION') return `Versión${thread.version ? ` · ${thread.version.name}` : ''}`;
  return threadTargetLabels[thread.targetType];
}

export function formatThreadDate(value: string) {
  return new Date(value).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
