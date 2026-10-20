import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

vi.mock('../api', () => ({
  loginRequest: vi.fn(),
  registerRequest: vi.fn(),
}));

import { loginRequest, registerRequest } from '../api';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('cambia a registro y valida que las contraseñas coincidan antes de llamar al API', () => {
    render(<LoginPage onLogin={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(screen.getByRole('heading', { name: 'Crea tu cuenta' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Luz' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'luz@mail.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreta123' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'otra12345' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Crear cuenta' }).closest('form')!);

    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(registerRequest).not.toHaveBeenCalled();
  });

  it('registra la cuenta, guarda la sesion y avisa al App', async () => {
    const user = { id: 'u1', name: 'Luz', email: 'luz@mail.com', organizations: [] };
    vi.mocked(registerRequest).mockResolvedValue({ ok: true, user, accessToken: 't', next: 'onboarding' });
    const onLogin = vi.fn();
    render(<LoginPage onLogin={onLogin} />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Luz' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'luz@mail.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreta123' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'secreta123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Crear cuenta' }).closest('form')!);

    await vi.waitFor(() => expect(onLogin).toHaveBeenCalledWith(user));
    expect(JSON.parse(localStorage.getItem('hh_user') || '{}').id).toBe('u1');
    expect(loginRequest).not.toHaveBeenCalled();
  });
});
