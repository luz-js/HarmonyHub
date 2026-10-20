export type EventStatus = 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FINISHED';
export type AttendanceStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';

export class InvalidEventStatusTransitionError extends Error {}
export class InvalidEventScheduleError extends Error {}

/**
 * Ciclo de vida de un evento:
 * DRAFT (planeando) -> PENDING (esperando confirmaciones) -> CONFIRMED (equipo listo) -> FINISHED.
 * CANCELLED se puede alcanzar antes de terminar y se reabre volviendo a DRAFT.
 */
const ALLOWED_EVENT_STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  DRAFT: ['PENDING', 'CONFIRMED', 'CANCELLED'],
  PENDING: ['DRAFT', 'CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PENDING', 'FINISHED', 'CANCELLED'],
  CANCELLED: ['DRAFT'],
  FINISHED: [],
};

export function getAllowedEventStatusTransitions(from: EventStatus) {
  return ALLOWED_EVENT_STATUS_TRANSITIONS[from];
}

export function assertEventStatusTransition(from: EventStatus, to: EventStatus) {
  if (from === to) return;
  if (!ALLOWED_EVENT_STATUS_TRANSITIONS[from].includes(to)) {
    throw new InvalidEventStatusTransitionError(`No se puede pasar un evento de ${from} a ${to}`);
  }
}

/** La hora de fin es opcional, pero si existe no puede ser anterior al inicio. */
export function assertValidEventSchedule(startsAt: Date, endsAt?: Date | null) {
  if (Number.isNaN(startsAt.getTime())) throw new InvalidEventScheduleError('La fecha de inicio no es valida');
  if (!endsAt) return;
  if (Number.isNaN(endsAt.getTime())) throw new InvalidEventScheduleError('La fecha de fin no es valida');
  if (endsAt.getTime() < startsAt.getTime()) {
    throw new InvalidEventScheduleError('La hora de fin no puede ser anterior a la de inicio');
  }
}

export function summarizeAttendance(musicians: Array<{ status: AttendanceStatus }>) {
  const summary = { total: musicians.length, confirmed: 0, pending: 0, declined: 0 };
  for (const musician of musicians) {
    if (musician.status === 'CONFIRMED') summary.confirmed += 1;
    else if (musician.status === 'DECLINED') summary.declined += 1;
    else summary.pending += 1;
  }
  return summary;
}

/** Un evento cancelado o terminado no acepta cambios en el equipo. */
export function isEventLocked(status: EventStatus) {
  return status === 'CANCELLED' || status === 'FINISHED';
}
