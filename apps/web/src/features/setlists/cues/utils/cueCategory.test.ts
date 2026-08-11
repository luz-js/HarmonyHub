import { describe, expect, it } from 'vitest';
import { getCueCategory, getSuggestedRolesForCueType } from './cueCategory';

describe('getCueCategory', () => {
  it('clasifica tipos representativos en la categoria esperada', () => {
    expect(getCueCategory('COUNT_IN')).toBe('MUSICAL');
    expect(getCueCategory('CLICK_START')).toBe('TRACKS');
    expect(getCueCategory('PRAYER')).toBe('SPEAKING');
    expect(getCueCategory('VIDEO_START')).toBe('VIDEO');
    expect(getCueCategory('LIGHTS_SCENE')).toBe('LIGHTING');
    expect(getCueCategory('AUDIO_LEVEL')).toBe('AUDIO');
    expect(getCueCategory('CAPO_CHANGE')).toBe('INSTRUMENT');
    expect(getCueCategory('TIMER')).toBe('LOGISTICS');
    expect(getCueCategory('CUSTOM')).toBe('CUSTOM');
  });
});

describe('getSuggestedRolesForCueType', () => {
  it('sugiere roles relevantes sin ser exhaustivo (es solo sugerencia)', () => {
    expect(getSuggestedRolesForCueType('CLICK_START')).toContain('CLICK');
    expect(getSuggestedRolesForCueType('PRAYER')).toContain('PRAYER_LEADER');
  });

  it('devuelve lista vacia para tipos sin sugerencia definida (no rompe el picker)', () => {
    expect(getSuggestedRolesForCueType('MARKER')).toEqual([]);
  });
});
