import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeSetlistItem } from '../test-utils/makeSetlistItem';
import { useSetlistSelection } from './useSetlistSelection';

describe('useSetlistSelection', () => {
  const items = [makeSetlistItem({ id: 'a', title: 'Cancion A' }), makeSetlistItem({ id: 'b', title: 'Cancion B' })];

  it('select/clear cambian la seleccion (seleccion unica)', () => {
    let selectedItemId: string | null = null;
    const setSelectedItemId = vi.fn((id: string | null) => {
      selectedItemId = id;
    });

    const { result, rerender } = renderHook(() => useSetlistSelection({ items, selectedItemId, setSelectedItemId }));

    act(() => result.current.select('a'));
    rerender();
    expect(setSelectedItemId).toHaveBeenCalledWith('a');

    act(() => result.current.clear());
    expect(setSelectedItemId).toHaveBeenCalledWith(null);
  });

  it('Escape limpia la seleccion', () => {
    const setSelectedItemId = vi.fn();
    const { result } = renderHook(() => useSetlistSelection({ items, selectedItemId: 'a', setSelectedItemId }));

    act(() => {
      result.current.handleKeyDown({ key: 'Escape', preventDefault: vi.fn() } as any);
    });

    expect(setSelectedItemId).toHaveBeenCalledWith(null);
  });

  it('Delete dispara onDeleteSelected con el item seleccionado', () => {
    const onDeleteSelected = vi.fn();
    const setSelectedItemId = vi.fn();
    const { result } = renderHook(() => useSetlistSelection({ items, selectedItemId: 'b', setSelectedItemId, onDeleteSelected }));

    act(() => {
      result.current.handleKeyDown({ key: 'Delete', preventDefault: vi.fn() } as any);
    });

    expect(onDeleteSelected).toHaveBeenCalledWith(items[1]);
  });

  it('Delete sin item seleccionado no hace nada', () => {
    const onDeleteSelected = vi.fn();
    const setSelectedItemId = vi.fn();
    const { result } = renderHook(() => useSetlistSelection({ items, selectedItemId: null, setSelectedItemId, onDeleteSelected }));

    act(() => {
      result.current.handleKeyDown({ key: 'Delete', preventDefault: vi.fn() } as any);
    });

    expect(onDeleteSelected).not.toHaveBeenCalled();
  });
});
