import { describe, expect, it } from 'vitest';
import { isProfileComplete } from './profileCompletion';

describe('isProfileComplete: telefono y al menos un instrumento', () => {
  it('pide las dos cosas', () => {
    expect(isProfileComplete({ phone: '555-1234', instruments: [{}] })).toBe(true);
    expect(isProfileComplete({ phone: '555-1234', instruments: [] })).toBe(false);
    expect(isProfileComplete({ phone: '   ', instruments: [{}] })).toBe(false);
    expect(isProfileComplete({ phone: null, instruments: [{}] })).toBe(false);
    expect(isProfileComplete(undefined)).toBe(false);
  });
});
