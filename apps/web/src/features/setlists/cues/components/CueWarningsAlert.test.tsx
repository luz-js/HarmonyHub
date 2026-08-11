import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CueWarning } from '../../../../shared/types';
import { CueWarningsAlert } from './CueWarningsAlert';

describe('CueWarningsAlert', () => {
  it('no renderiza nada sin advertencias', () => {
    const { container } = render(<CueWarningsAlert warnings={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el conteo y los mensajes de cada advertencia', () => {
    const warnings: CueWarning[] = [
      { cueId: 'c1', code: 'CRITICAL_WITHOUT_RESPONSIBLE', message: 'Cue critico sin responsable' },
      { cueId: 'c2', code: 'BLOCKED', message: 'Cue bloqueado' },
    ];
    render(<CueWarningsAlert warnings={warnings} />);

    expect(screen.getByText('2 advertencias de produccion')).toBeInTheDocument();
    expect(screen.getByText('Cue critico sin responsable')).toBeInTheDocument();
    expect(screen.getByText('Cue bloqueado')).toBeInTheDocument();
  });

  it('usa singular cuando hay solo una advertencia', () => {
    render(<CueWarningsAlert warnings={[{ cueId: 'c1', code: 'BLOCKED', message: 'Cue bloqueado' }]} />);
    expect(screen.getByText('1 advertencia de produccion')).toBeInTheDocument();
  });

  it('trunca la lista a 8 y muestra un contador de "mas"', () => {
    const warnings: CueWarning[] = Array.from({ length: 10 }, (_, index) => ({
      cueId: `c${index}`,
      code: 'BLOCKED' as const,
      message: `Warning ${index}`,
    }));
    render(<CueWarningsAlert warnings={warnings} />);
    expect(screen.getByText('+ 2 mas')).toBeInTheDocument();
  });
});
