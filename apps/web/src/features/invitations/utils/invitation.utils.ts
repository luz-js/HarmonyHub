import type { InvitationSummary } from '../../../shared/types';

export function isInvitationExpired(invitation: Pick<InvitationSummary, 'expiresAt'>, now = new Date()) {
  return new Date(invitation.expiresAt).getTime() <= now.getTime();
}

/** "29 oct". */
export function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
}
