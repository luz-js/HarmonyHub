import { describe, expect, it } from 'vitest';
import { formatRelativeTime, getGreeting, getInitials } from './dashboard.utils';

describe('dashboard utils', () => {
  it('saluda segun la hora', () => {
    expect(getGreeting(new Date(2026, 9, 17, 8))).toBe('Buenos días');
    expect(getGreeting(new Date(2026, 9, 17, 15))).toBe('Buenas tardes');
    expect(getGreeting(new Date(2026, 9, 17, 22))).toBe('Buenas noches');
    expect(getGreeting(new Date(2026, 9, 17, 2))).toBe('Buenas noches');
  });

  it('formatea tiempos relativos en español', () => {
    const now = new Date(2026, 9, 17, 12, 0);
    const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
    expect(formatRelativeTime(ago(20 * 1000), now)).toBe('Hace un momento');
    expect(formatRelativeTime(ago(5 * 60 * 1000), now)).toBe('Hace 5 min');
    expect(formatRelativeTime(ago(60 * 60 * 1000), now)).toBe('Hace 1 hora');
    expect(formatRelativeTime(ago(3 * 60 * 60 * 1000), now)).toBe('Hace 3 horas');
    expect(formatRelativeTime(ago(26 * 60 * 60 * 1000), now)).toBe('Ayer');
    expect(formatRelativeTime(ago(3 * 24 * 60 * 60 * 1000), now)).toBe('Hace 3 días');
  });

  it('calcula iniciales', () => {
    expect(getInitials('María González López')).toBe('MG');
    expect(getInitials('Pedro')).toBe('P');
    expect(getInitials('')).toBe('?');
    expect(getInitials(null)).toBe('?');
  });
});
