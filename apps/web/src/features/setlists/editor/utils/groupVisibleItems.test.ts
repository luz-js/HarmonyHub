import { describe, expect, it } from 'vitest';
import { makeSetlistItem } from '../test-utils/makeSetlistItem';
import { groupVisibleItems } from './groupVisibleItems';

describe('groupVisibleItems', () => {
  it('sin colapsar, expone metadata de grupo pero lista items individuales', () => {
    const items = [
      makeSetlistItem({ id: 'a', type: 'SONG' }),
      makeSetlistItem({ id: 'b', type: 'SONG' }),
      makeSetlistItem({ id: 'c', type: 'PRAYER' }),
    ];

    const entries = groupVisibleItems(items, new Set());
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({ kind: 'item', groupSize: 2, isGroupStart: true });
    expect(entries[1]).toMatchObject({ kind: 'item', groupSize: 2, isGroupStart: false });
    expect(entries[2]).toMatchObject({ kind: 'item' });
    expect((entries[2] as { groupId?: string }).groupId).toBeUndefined();
  });

  it('colapsa un run consecutivo cuando su groupId esta en collapsedGroupIds', () => {
    const items = [makeSetlistItem({ id: 'a', type: 'SONG' }), makeSetlistItem({ id: 'b', type: 'SONG' }), makeSetlistItem({ id: 'c', type: 'PRAYER' })];

    const groupId = `group:a:b`;
    const entries = groupVisibleItems(items, new Set([groupId]));

    expect(entries).toEqual([
      { kind: 'group', id: groupId, type: 'SONG', items: [items[0], items[1]] },
      { kind: 'item', item: items[2] },
    ]);
  });

  it('no agrupa runs de un solo item', () => {
    const items = [makeSetlistItem({ id: 'a', type: 'SONG' }), makeSetlistItem({ id: 'b', type: 'PRAYER' })];
    const entries = groupVisibleItems(items, new Set());
    expect(entries).toEqual([
      { kind: 'item', item: items[0] },
      { kind: 'item', item: items[1] },
    ]);
  });

  it('nunca reordena ni muta los items originales', () => {
    const items = [makeSetlistItem({ id: 'a', type: 'SONG' }), makeSetlistItem({ id: 'b', type: 'SONG' })];
    const snapshot = JSON.stringify(items);
    groupVisibleItems(items, new Set(['group:a:b']));
    expect(JSON.stringify(items)).toBe(snapshot);
  });
});
