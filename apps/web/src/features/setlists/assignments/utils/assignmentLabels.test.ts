import { describe, expect, it } from 'vitest';
import {
  ASSIGNMENT_PREPARATION_STATUS_KEYS,
  PARTICIPANT_STATUS_BADGE_CLASS,
  PARTICIPANT_STATUS_LABELS,
  PREPARATION_STATUS_BADGE_CLASS,
  PREPARATION_STATUS_LABELS,
  ROLE_LABELS,
  getRoleLabel,
} from './assignmentLabels';

describe('assignmentLabels', () => {
  it('getRoleLabel devuelve una etiqueta en español para cada rol conocido', () => {
    expect(getRoleLabel('LEAD_VOCAL')).toBe('Voz principal');
    expect(getRoleLabel('MUSIC_DIRECTOR')).toBe('Director musical');
  });

  it('getRoleLabel cae al valor crudo si el rol no esta en el mapa (defensivo)', () => {
    expect(getRoleLabel('UNKNOWN' as never)).toBe('UNKNOWN');
  });

  it('cada estado de preparacion tiene label y clase de badge', () => {
    for (const status of ASSIGNMENT_PREPARATION_STATUS_KEYS) {
      expect(PREPARATION_STATUS_LABELS[status]).toBeTruthy();
      expect(PREPARATION_STATUS_BADGE_CLASS[status]).toMatch(/^badge-/);
    }
  });

  it('cada estado de participante tiene label y clase de badge', () => {
    for (const status of Object.keys(PARTICIPANT_STATUS_LABELS) as Array<keyof typeof PARTICIPANT_STATUS_LABELS>) {
      expect(PARTICIPANT_STATUS_LABELS[status]).toBeTruthy();
      expect(PARTICIPANT_STATUS_BADGE_CLASS[status]).toMatch(/^badge-/);
    }
  });

  it('ROLE_LABELS cubre todos los roles usados por el backend', () => {
    expect(Object.keys(ROLE_LABELS).length).toBeGreaterThanOrEqual(29);
  });
});
