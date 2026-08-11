import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useStagePersistence } from './useStagePersistence';

const STORAGE_KEY = 'stage-mode-state';

describe('useStagePersistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('update aplica un patch parcial y persiste en localStorage', () => {
    const { result } = renderHook(() => useStagePersistence('setlist-1'));

    act(() => result.current.update({ currentItemId: 'item-a', layout: 'PRODUCTION' }));
    expect(result.current.state.currentItemId).toBe('item-a');
    expect(result.current.state.layout).toBe('PRODUCTION');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored['setlist-1'].currentItemId).toBe('item-a');
    expect(stored['setlist-1'].layout).toBe('PRODUCTION');
  });

  it('campos no tocados por el patch conservan su valor por defecto', () => {
    const { result } = renderHook(() => useStagePersistence('setlist-1'));
    act(() => result.current.update({ zoom: 24 }));
    expect(result.current.state.showLyrics).toBe(true);
    expect(result.current.state.clockFormat).toBe('24');
  });

  it('localStorage corrupto no rompe el hook (vuelve al estado por defecto)', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const { result } = renderHook(() => useStagePersistence('setlist-1'));
    expect(result.current.state.layout).toBe('SONG_LYRICS');
  });

  it('el estado esta aislado por setlistId', () => {
    const { result: resultA } = renderHook(() => useStagePersistence('setlist-a'));
    const { result: resultB } = renderHook(() => useStagePersistence('setlist-b'));

    act(() => resultA.current.update({ currentItemId: 'item-x' }));

    expect(resultA.current.state.currentItemId).toBe('item-x');
    expect(resultB.current.state.currentItemId).toBe(null);
  });
});
