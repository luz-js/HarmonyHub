import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SetlistParticipant } from '../../../../shared/types';
import { ParticipantCard } from './ParticipantCard';

function makeParticipant(overrides: Partial<SetlistParticipant> = {}): SetlistParticipant {
  return {
    id: 'p1',
    status: 'CONFIRMED',
    generalRole: null,
    generalNote: null,
    membership: { id: 'm1', role: 'MUSICIAN', instrument: 'Guitarra', user: { id: 'u1', name: 'Ana Perez', avatarUrl: null } },
    assignmentsCount: 0,
    readyCount: 0,
    pendingCount: 0,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('ParticipantCard', () => {
  it('no muestra advertencia si esta confirmado', () => {
    render(<ParticipantCard participant={makeParticipant()} canManage={false} onChangeStatus={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.queryByText(/rechazo la invitacion/i)).not.toBeInTheDocument();
  });

  it('no muestra advertencia si rechazo pero no tiene asignaciones', () => {
    render(<ParticipantCard participant={makeParticipant({ status: 'DECLINED', assignmentsCount: 0 })} canManage={false} onChangeStatus={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.queryByText(/rechazo la invitacion/i)).not.toBeInTheDocument();
  });

  it('muestra advertencia si rechazo la invitacion pero aun tiene asignaciones', () => {
    render(<ParticipantCard participant={makeParticipant({ status: 'DECLINED', assignmentsCount: 2 })} canManage={false} onChangeStatus={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText(/rechazo la invitacion/i)).toBeInTheDocument();
  });
});
