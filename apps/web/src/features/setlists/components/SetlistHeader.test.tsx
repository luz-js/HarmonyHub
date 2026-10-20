import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SetlistDetail } from '../../../shared/types';
import { SetlistHeader } from './SetlistHeader';

function makeSetlist(overrides: Partial<SetlistDetail> = {}): SetlistDetail {
  return {
    id: 's1',
    name: 'Culto domingo',
    description: null,
    status: 'DRAFT',
    isTemplate: false,
    estimatedSec: 1200,
    itemCount: 4,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    items: [],
    ...overrides,
  } as SetlistDetail;
}

function renderHeader(setlist: SetlistDetail, handlers: Partial<Record<'onSaveAsTemplate' | 'onCreateFromTemplate', () => void>> = {}) {
  return render(
    <SetlistHeader
      setlist={setlist}
      canManage
      canPublish
      canArchive
      canDelete={false}
      publishing={false}
      archiving={false}
      deleting={false}
      onBack={() => {}}
      onEdit={() => {}}
      onPublish={() => {}}
      onArchive={() => {}}
      onDelete={() => {}}
      onEnterStageMode={() => {}}
      {...handlers}
    />,
  );
}

describe('SetlistHeader con plantillas', () => {
  it('en un setlist normal ofrece Stage Mode, Publicar y Guardar como plantilla', () => {
    const onSaveAsTemplate = vi.fn();
    renderHeader(makeSetlist(), { onSaveAsTemplate });

    expect(screen.getByRole('button', { name: /Stage Mode/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publicar/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Guardar como plantilla/ }));
    expect(onSaveAsTemplate).toHaveBeenCalledTimes(1);
  });

  it('en una plantilla oculta Stage Mode, Publicar y Archivar y ofrece Usar plantilla', () => {
    const onCreateFromTemplate = vi.fn();
    renderHeader(makeSetlist({ isTemplate: true }), { onCreateFromTemplate });

    expect(screen.queryByRole('button', { name: /Stage Mode/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Publicar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Archivar/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Usar plantilla/ }));
    expect(onCreateFromTemplate).toHaveBeenCalledTimes(1);
  });
});
