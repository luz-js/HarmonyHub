import { describe, expect, it } from 'vitest';
import { calculateCueTimelinePosition, formatCueClock } from './cueTimeline';

describe('calculateCueTimelinePosition', () => {
  it('GLOBAL usa el offset desde el inicio del setlist', () => {
    expect(calculateCueTimelinePosition({ phase: 'GLOBAL', offsetSec: 300, itemStartSec: null, itemDurationSec: null })).toBe(300);
  });

  it('BEFORE/DURING = itemStartSec + offsetSec', () => {
    expect(calculateCueTimelinePosition({ phase: 'BEFORE', offsetSec: -8, itemStartSec: 330, itemDurationSec: 260 })).toBe(322);
    expect(calculateCueTimelinePosition({ phase: 'DURING', offsetSec: 80, itemStartSec: 330, itemDurationSec: 260 })).toBe(410);
  });

  it('AFTER = itemStartSec + itemDurationSec + offsetSec', () => {
    expect(calculateCueTimelinePosition({ phase: 'AFTER', offsetSec: 5, itemStartSec: 330, itemDurationSec: 260 })).toBe(595);
  });

  it('sin itemStartSec conocido (item no encontrado) devuelve null salvo GLOBAL', () => {
    expect(calculateCueTimelinePosition({ phase: 'BEFORE', offsetSec: 0, itemStartSec: null, itemDurationSec: null })).toBe(null);
  });
});

describe('formatCueClock', () => {
  it('formatea segundos como mm:ss', () => {
    expect(formatCueClock(65)).toBe('1:05');
    expect(formatCueClock(0)).toBe('0:00');
  });

  it('incluye horas cuando supera los 3600 segundos', () => {
    expect(formatCueClock(3665)).toBe('1:01:05');
  });
});
