import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeSetlistItem } from '../../editor/test-utils/makeSetlistItem';
import { SongWorkspaceHeader } from './SongWorkspaceHeader';

const liveVersion = {
  id: 'v1',
  songId: 's1',
  name: 'Original',
  key: 'D',
  bpm: 90,
  durationSec: 240,
  lyrics: null,
  chords: null,
  contentJson: null,
  structureJson: null,
  notes: null,
  isDefault: true,
} as any;

describe('SongWorkspaceHeader', () => {
  it('muestra Original -> Override cuando el item tiene un override que difiere del valor vigente', () => {
    const item = makeSetlistItem({
      keyOverride: 'C',
      effective: { key: 'C', bpm: 90, durationSec: 240, capo: null },
    });

    render(<SongWorkspaceHeader item={item} liveVersion={liveVersion} />);

    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === 'Key: D → C')).toBeInTheDocument();
  });

  it('sin override, muestra solo el valor vigente (sin tachado de comparacion)', () => {
    const item = makeSetlistItem({
      keyOverride: null,
      effective: { key: 'D', bpm: 90, durationSec: 240, capo: null },
    });

    const { container } = render(<SongWorkspaceHeader item={item} liveVersion={liveVersion} />);

    expect(container.querySelector('.line-through')).not.toBeInTheDocument();
  });
});
