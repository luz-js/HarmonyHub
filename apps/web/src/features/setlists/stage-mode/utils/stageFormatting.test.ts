import { describe, expect, it } from 'vitest';
import { formatElapsed, formatLiveClock } from './stageFormatting';

describe('formatElapsed', () => {
  it('formatea segundos como mm:ss', () => {
    expect(formatElapsed(65)).toBe('1:05');
  });

  it('incluye horas cuando supera los 3600 segundos', () => {
    expect(formatElapsed(3665)).toBe('1:01:05');
  });
});

describe('formatLiveClock', () => {
  it('formato 24h', () => {
    expect(formatLiveClock(new Date(2026, 0, 1, 14, 5), '24')).toBe('14:05');
  });

  it('formato 12h con AM/PM', () => {
    expect(formatLiveClock(new Date(2026, 0, 1, 14, 5), '12')).toBe('2:05 PM');
    expect(formatLiveClock(new Date(2026, 0, 1, 0, 5), '12')).toBe('12:05 AM');
    expect(formatLiveClock(new Date(2026, 0, 1, 12, 0), '12')).toBe('12:00 PM');
  });
});
