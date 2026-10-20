import { describe, expect, it } from 'vitest';
import {
  buildEventInput,
  canDeleteEventsClientSide,
  canManageEventsClientSide,
  combineLocalDateTime,
  emptyEventDraft,
  eventToDraft,
  formatEventTime,
  isEventLocked,
  toLocalDateKey,
} from './event.utils';

describe('event utils', () => {
  it('combina dia y hora locales y rechaza valores incompletos', () => {
    const value = combineLocalDateTime('2026-10-18', '09:30');
    expect(value?.getFullYear()).toBe(2026);
    expect(value?.getMonth()).toBe(9);
    expect(value?.getDate()).toBe(18);
    expect(value?.getHours()).toBe(9);
    expect(value?.getMinutes()).toBe(30);
    expect(combineLocalDateTime('', '09:30')).toBeNull();
    expect(combineLocalDateTime('2026-10-18', '')).toBeNull();
  });

  it('buildEventInput arma el payload con fechas ISO y campos opcionales en null', () => {
    const result = buildEventInput({ ...emptyEventDraft('2026-10-18'), name: '  Culto domingo ', startTime: '09:00', endTime: '11:00' });
    expect(result.error).toBeUndefined();
    expect(result.input?.name).toBe('Culto domingo');
    expect(new Date(result.input!.startsAt).getHours()).toBe(9);
    expect(new Date(result.input!.endsAt!).getHours()).toBe(11);
    expect(result.input?.location).toBeNull();
    expect(result.input?.setlistId).toBeNull();
  });

  it('buildEventInput valida nombre, inicio y que el fin no sea anterior', () => {
    expect(buildEventInput({ ...emptyEventDraft('2026-10-18'), name: ' ' }).error).toBe('El nombre es requerido.');
    expect(buildEventInput({ ...emptyEventDraft(''), name: 'Ensayo' }).error).toBe('Indica la fecha y la hora de inicio.');
    expect(buildEventInput({ ...emptyEventDraft('2026-10-18'), name: 'Ensayo', startTime: '20:00', endTime: '19:00' }).error).toBe(
      'La hora de fin no puede ser anterior a la de inicio.',
    );
  });

  it('eventToDraft vuelve a separar la fecha y las horas locales', () => {
    const startsAt = new Date(2026, 9, 18, 9, 0).toISOString();
    const endsAt = new Date(2026, 9, 18, 11, 15).toISOString();
    const draft = eventToDraft({ name: 'Culto', startsAt, endsAt, location: null, description: null, setlist: { id: 's1' } });
    expect(draft).toMatchObject({ name: 'Culto', day: '2026-10-18', startTime: '09:00', endTime: '11:15', setlistId: 's1' });
    expect(formatEventTime(startsAt, endsAt)).toBe('09:00 - 11:15');
    expect(formatEventTime(startsAt, null)).toBe('09:00');
  });

  it('permisos de cliente y bloqueo por estado reflejan las reglas del backend', () => {
    expect(canManageEventsClientSide('LEADER')).toBe(true);
    expect(canManageEventsClientSide('MUSICIAN')).toBe(false);
    expect(canDeleteEventsClientSide('LEADER')).toBe(false);
    expect(canDeleteEventsClientSide('ADMIN')).toBe(true);
    expect(isEventLocked('FINISHED')).toBe(true);
    expect(isEventLocked('PENDING')).toBe(false);
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
