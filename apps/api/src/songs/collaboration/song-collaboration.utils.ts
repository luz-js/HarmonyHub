import type { SongCommentTarget } from '@prisma/client';

export class InvalidThreadTargetError extends Error {}

/**
 * Valida la coherencia minima entre targetType/versionId/targetRef antes de
 * crear un thread. No valida que la seccion siga existiendo (eso se hace por
 * separado, solo cuando el contentJson actual esta disponible).
 */
export function assertValidThreadTarget(targetType: SongCommentTarget, versionId: string | null | undefined, targetRef: string | null | undefined) {
  if (targetType === 'SECTION') {
    if (!versionId) throw new InvalidThreadTargetError('Los comentarios de seccion requieren una version');
    if (!targetRef || !targetRef.trim()) throw new InvalidThreadTargetError('targetRef requerido para comentarios de seccion');
  }
  if (targetType === 'VERSION' && !versionId) {
    throw new InvalidThreadTargetError('Los comentarios de version requieren una version');
  }
}

/** Comprueba que targetRef (id de seccion) exista dentro del contentJson actual, cuando este disponible. */
export function sectionExistsInContent(contentJson: unknown, sectionId: string): boolean {
  if (!contentJson || typeof contentJson !== 'object') return false;
  const sections = (contentJson as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) return false;
  return sections.some((section) => (section as { id?: unknown })?.id === sectionId);
}

/** Deduplica y valida formato basico de una lista de IDs de usuario mencionados. */
export function normalizeMentionedUserIds(mentionedUserIds: unknown): string[] {
  if (!Array.isArray(mentionedUserIds)) return [];
  const ids = mentionedUserIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  return Array.from(new Set(ids));
}
