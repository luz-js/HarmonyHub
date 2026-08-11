import { describe, expect, it } from 'vitest';
import { makeSetlistItem } from '../../editor/test-utils/makeSetlistItem';
import { makeSetlistCue } from '../../cues/test-utils/makeSetlistCue';
import {
  findFirstCueForItem,
  getNextCueId,
  getNextItemId,
  getPreviousCueId,
  getPreviousItemId,
  getVisibleItems,
  sortCuesByTimeline,
} from './stageNavigation.utils';

describe('getVisibleItems', () => {
  it('excluye items ocultos', () => {
    const items = [makeSetlistItem({ id: 'a' }), makeSetlistItem({ id: 'hidden', isHidden: true }), makeSetlistItem({ id: 'b' })];
    expect(getVisibleItems(items).map((item) => item.id)).toEqual(['a', 'b']);
  });
});

describe('getNextItemId / getPreviousItemId', () => {
  const visible = [makeSetlistItem({ id: 'a' }), makeSetlistItem({ id: 'b' }), makeSetlistItem({ id: 'c' })];

  it('avanza al siguiente item sin salirse de rango', () => {
    expect(getNextItemId(visible, 'a')).toBe('b');
    expect(getNextItemId(visible, 'c')).toBe('c');
  });

  it('retrocede al item anterior sin salirse de rango', () => {
    expect(getPreviousItemId(visible, 'b')).toBe('a');
    expect(getPreviousItemId(visible, 'a')).toBe('a');
  });

  it('sin item actual (null o desconocido) devuelve el primero', () => {
    expect(getNextItemId(visible, null)).toBe('a');
    expect(getPreviousItemId(visible, 'no-existe')).toBe('a');
  });

  it('lista vacia devuelve null', () => {
    expect(getNextItemId([], 'a')).toBe(null);
  });
});

describe('sortCuesByTimeline / getNextCueId / getPreviousCueId', () => {
  const cues = [
    makeSetlistCue({ id: 'c3', timelinePositionSec: 300 }),
    makeSetlistCue({ id: 'c1', timelinePositionSec: 0 }),
    makeSetlistCue({ id: 'c2', timelinePositionSec: 100 }),
  ];

  it('ordena por timelinePositionSec ascendente', () => {
    expect(sortCuesByTimeline(cues).map((cue) => cue.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('navega siguiente/anterior sobre el orden ya calculado', () => {
    const sorted = sortCuesByTimeline(cues);
    expect(getNextCueId(sorted, 'c1')).toBe('c2');
    expect(getNextCueId(sorted, 'c3')).toBe('c3');
    expect(getPreviousCueId(sorted, 'c2')).toBe('c1');
    expect(getPreviousCueId(sorted, 'c1')).toBe('c1');
  });
});

describe('findFirstCueForItem', () => {
  it('prioriza el primer cue de fase BEFORE del item', () => {
    const cues = sortCuesByTimeline([
      makeSetlistCue({ id: 'during', setlistItemId: 'item1', phase: 'DURING', timelinePositionSec: 10 }),
      makeSetlistCue({ id: 'before', setlistItemId: 'item1', phase: 'BEFORE', timelinePositionSec: 5 }),
    ]);
    expect(findFirstCueForItem(cues, 'item1')).toBe('before');
  });

  it('si no hay cue BEFORE, cae al primero de cualquier fase del item', () => {
    const cues = sortCuesByTimeline([makeSetlistCue({ id: 'after', setlistItemId: 'item1', phase: 'AFTER', timelinePositionSec: 5 })]);
    expect(findFirstCueForItem(cues, 'item1')).toBe('after');
  });

  it('sin cues para el item devuelve null', () => {
    expect(findFirstCueForItem([], 'item1')).toBe(null);
  });
});
