import { describe, expect, it } from 'vitest';
import { makeSetlistItem } from '../test-utils/makeSetlistItem';
import { calculateRunningTimeline } from './calculateTimeline';

describe('calculateRunningTimeline', () => {
  it('acumula la duracion efectiva de items visibles en orden', () => {
    const items = [
      makeSetlistItem({ id: 'a', effective: { key: null, bpm: null, durationSec: 60, capo: null } }),
      makeSetlistItem({ id: 'b', effective: { key: null, bpm: null, durationSec: 120, capo: null } }),
      makeSetlistItem({ id: 'c', effective: { key: null, bpm: null, durationSec: 30, capo: null } }),
    ];

    expect(calculateRunningTimeline(items)).toEqual([
      { itemId: 'a', startSec: 0 },
      { itemId: 'b', startSec: 60 },
      { itemId: 'c', startSec: 180 },
    ]);
  });

  it('los items ocultos no avanzan el reloj', () => {
    const items = [
      makeSetlistItem({ id: 'a', effective: { key: null, bpm: null, durationSec: 60, capo: null } }),
      makeSetlistItem({ id: 'hidden', isHidden: true, effective: { key: null, bpm: null, durationSec: 500, capo: null } }),
      makeSetlistItem({ id: 'b', effective: { key: null, bpm: null, durationSec: 30, capo: null } }),
    ];

    expect(calculateRunningTimeline(items)).toEqual([
      { itemId: 'a', startSec: 0 },
      { itemId: 'hidden', startSec: 60 },
      { itemId: 'b', startSec: 60 },
    ]);
  });

  it('trata durationSec nulo como 0', () => {
    const items = [makeSetlistItem({ id: 'a', effective: { key: null, bpm: null, durationSec: null, capo: null } }), makeSetlistItem({ id: 'b' })];
    expect(calculateRunningTimeline(items)[1].startSec).toBe(0);
  });
});
