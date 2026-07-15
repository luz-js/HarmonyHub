import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSetlistWorkspaceLayout } from './useSetlistWorkspaceLayout';

const STORAGE_KEY = 'setlist-workspace-state';

describe('useSetlistWorkspaceLayout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('toggleExpanded agrega y quita el item, y persiste en localStorage', () => {
    const { result } = renderHook(() => useSetlistWorkspaceLayout('setlist-1'));

    act(() => result.current.toggleExpanded('item-a'));
    expect(result.current.expandedItemIds.has('item-a')).toBe(true);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored['setlist-1'].expandedItemIds).toEqual(['item-a']);

    act(() => result.current.toggleExpanded('item-a'));
    expect(result.current.expandedItemIds.has('item-a')).toBe(false);
  });

  it('collapse es unidireccional (no reabre un item ya colapsado)', () => {
    const { result } = renderHook(() => useSetlistWorkspaceLayout('setlist-1'));

    act(() => result.current.toggleExpanded('item-a'));
    act(() => result.current.collapse('item-a'));
    expect(result.current.expandedItemIds.has('item-a')).toBe(false);

    act(() => result.current.collapse('item-a'));
    expect(result.current.expandedItemIds.has('item-a')).toBe(false);
  });

  it('setActiveTab persiste la tab activa por item', () => {
    const { result } = renderHook(() => useSetlistWorkspaceLayout('setlist-1'));

    act(() => result.current.setActiveTab('item-a', 'tracks'));
    expect(result.current.activeTabByItemId['item-a']).toBe('tracks');
  });

  it('localStorage corrupto no rompe el hook (vuelve al estado por defecto)', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const { result } = renderHook(() => useSetlistWorkspaceLayout('setlist-1'));

    expect(result.current.expandedItemIds.size).toBe(0);
    expect(result.current.activeTabByItemId).toEqual({});
  });

  it('el estado esta aislado por setlistId', () => {
    const { result: resultA } = renderHook(() => useSetlistWorkspaceLayout('setlist-a'));
    const { result: resultB } = renderHook(() => useSetlistWorkspaceLayout('setlist-b'));

    act(() => resultA.current.toggleExpanded('item-x'));

    expect(resultA.current.expandedItemIds.has('item-x')).toBe(true);
    expect(resultB.current.expandedItemIds.has('item-x')).toBe(false);
  });
});
