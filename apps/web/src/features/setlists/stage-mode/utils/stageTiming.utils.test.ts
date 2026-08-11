import { describe, expect, it } from 'vitest';
import { calculateProgressRatio, deriveElapsedSec, deriveRemainingSec } from './stageTiming.utils';

describe('calculateProgressRatio', () => {
  it('calcula la proporcion transcurrida', () => {
    expect(calculateProgressRatio(50, 200)).toBe(0.25);
  });

  it('clampa entre 0 y 1', () => {
    expect(calculateProgressRatio(-10, 200)).toBe(0);
    expect(calculateProgressRatio(500, 200)).toBe(1);
  });

  it('duracion total <= 0 devuelve 0 (evita division por cero)', () => {
    expect(calculateProgressRatio(50, 0)).toBe(0);
  });
});

describe('deriveElapsedSec', () => {
  it('corriendo: acumulado + tiempo desde startedAt', () => {
    const elapsed = deriveElapsedSec({ isRunning: true, startedAt: 1000, accumulatedSec: 30 }, 6000);
    expect(elapsed).toBe(35); // 30 + (6000-1000)/1000
  });

  it('pausado: devuelve el acumulado congelado, sin sumar nada', () => {
    const elapsed = deriveElapsedSec({ isRunning: false, startedAt: null, accumulatedSec: 42 }, 999999);
    expect(elapsed).toBe(42);
  });
});

describe('deriveRemainingSec', () => {
  it('resta el transcurrido de la duracion total', () => {
    expect(deriveRemainingSec(50, 200)).toBe(150);
  });

  it('nunca es negativo', () => {
    expect(deriveRemainingSec(300, 200)).toBe(0);
  });
});
