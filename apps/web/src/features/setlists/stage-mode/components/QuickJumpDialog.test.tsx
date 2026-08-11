import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeSetlistItem } from '../../editor/test-utils/makeSetlistItem';
import { makeSetlistCue } from '../../cues/test-utils/makeSetlistCue';
import { QuickJumpDialog } from './QuickJumpDialog';

describe('QuickJumpDialog', () => {
  const items = [makeSetlistItem({ id: 'item1', title: 'Grande eres Dios' }), makeSetlistItem({ id: 'item2', title: 'Way Maker' })];
  const cues = [makeSetlistCue({ id: 'cue1', title: 'Iniciar pad', type: 'PAD_START' })];

  it('lista items y cues sin filtro', () => {
    render(<QuickJumpDialog items={items} cues={cues} onSelectItem={vi.fn()} onSelectCue={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Grande eres Dios')).toBeInTheDocument();
    expect(screen.getByText('Way Maker')).toBeInTheDocument();
    expect(screen.getByText('Iniciar pad')).toBeInTheDocument();
  });

  it('filtra por substring (insensible a mayusculas)', () => {
    render(<QuickJumpDialog items={items} cues={cues} onSelectItem={vi.fn()} onSelectCue={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'way' } });
    expect(screen.getByText('Way Maker')).toBeInTheDocument();
    expect(screen.queryByText('Grande eres Dios')).not.toBeInTheDocument();
  });

  it('seleccionar un item llama onSelectItem y cierra el dialogo', () => {
    const onSelectItem = vi.fn();
    const onClose = vi.fn();
    render(<QuickJumpDialog items={items} cues={cues} onSelectItem={onSelectItem} onSelectCue={vi.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByText('Way Maker'));
    expect(onSelectItem).toHaveBeenCalledWith('item2');
    expect(onClose).toHaveBeenCalled();
  });

  it('seleccionar un cue llama onSelectCue y cierra el dialogo', () => {
    const onSelectCue = vi.fn();
    const onClose = vi.fn();
    render(<QuickJumpDialog items={items} cues={cues} onSelectItem={vi.fn()} onSelectCue={onSelectCue} onClose={onClose} />);

    fireEvent.click(screen.getByText('Iniciar pad'));
    expect(onSelectCue).toHaveBeenCalledWith('cue1');
    expect(onClose).toHaveBeenCalled();
  });

  it('sin resultados muestra un mensaje', () => {
    render(<QuickJumpDialog items={items} cues={cues} onSelectItem={vi.fn()} onSelectCue={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'zzz-no-match' } });
    expect(screen.getByText('Sin resultados.')).toBeInTheDocument();
  });
});
