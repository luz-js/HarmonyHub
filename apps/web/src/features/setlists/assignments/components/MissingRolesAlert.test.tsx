import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SetlistItemCoverage } from '../../../../shared/types';
import { MissingRolesAlert } from './MissingRolesAlert';

describe('MissingRolesAlert', () => {
  it('no renderiza nada cuando la cobertura esta completa', () => {
    const coverage: SetlistItemCoverage = { requiredRoles: 2, coveredRoles: 2, missingRoles: [], status: 'COMPLETE' };
    const { container } = render(<MissingRolesAlert coverage={coverage} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lista cada rol faltante con su conteo asignado/requerido', () => {
    const coverage: SetlistItemCoverage = {
      requiredRoles: 2,
      coveredRoles: 0,
      status: 'EMPTY',
      missingRoles: [
        { role: 'LEAD_VOCAL', label: null, requiredCount: 1, assignedCount: 0 },
        { role: 'DRUMS', label: 'Bateria principal', requiredCount: 2, assignedCount: 1 },
      ],
    };
    render(<MissingRolesAlert coverage={coverage} />);

    expect(screen.getByText('Roles sin cubrir')).toBeInTheDocument();
    expect(screen.getByText('Voz principal: 0/1')).toBeInTheDocument();
    expect(screen.getByText('Bateria principal: 1/2')).toBeInTheDocument();
  });
});
