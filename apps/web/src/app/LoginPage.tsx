import { FormEvent, useState } from 'react';
import { Mail, Music2 } from 'lucide-react';
import { loginRequest, registerRequest } from '../api';
import { storeUser } from './session';
import type { AppUser } from './types';

type Mode = 'login' | 'register';

// Credenciales del seed solo en local, para no tener que escribirlas en cada prueba.
const IS_LOCALHOST = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const DEV_EMAIL = IS_LOCALHOST ? 'juan@email.com' : '';
const DEV_PASSWORD = IS_LOCALHOST ? 'password123' : '';

export function LoginPage({ onLogin }: { onLogin: (user: AppUser) => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(DEV_EMAIL);
  const [password, setPassword] = useState(DEV_PASSWORD);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isRegister = mode === 'register';

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    if (next === 'register') {
      setEmail('');
      setPassword('');
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (isRegister && password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);

    try {
      const user = isRegister ? (await registerRequest({ name, email, password, confirmPassword })).user : await loginRequest({ email, password });
      storeUser(user);
      onLogin(user);
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err: any) {
      setError(err.message || (isRegister ? 'No se pudo crear la cuenta' : 'No se pudo iniciar sesión'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-white subtle-grid">
      <section className="panel w-full max-w-[480px] p-6 shadow-soft sm:p-8">
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary text-on-primary"><Music2 className="h-5 w-5" /></span>
            <span className="font-display text-xl font-bold">HarmonyHub</span>
          </div>
        </div>

        <div className="mt-10 text-center">
          <h1 className="text-[28px] font-bold leading-tight text-white">{isRegister ? 'Crea tu cuenta' : 'Inicia sesión'}</h1>
          <p className="mt-2 text-sm text-muted">
            {isRegister ? 'Después vas a crear la organización de tu banda o ministerio.' : 'Entra para ver el repertorio y los eventos de tu equipo.'}
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-5">
          {isRegister && (
            <div>
              <label className="label" htmlFor="auth-name">Nombre</label>
              <input id="auth-name" value={name} onChange={(event) => setName(event.target.value)} className="input" autoComplete="name" required />
            </div>
          )}

          <div>
            <label className="label" htmlFor="auth-email">Correo electrónico</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input pl-9" autoComplete="email" required />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="auth-password">Contraseña</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? 8 : undefined}
              required
            />
          </div>

          {isRegister && (
            <div>
              <label className="label" htmlFor="auth-confirm">Confirmar contraseña</label>
              <input
                id="auth-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="input"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <p className="mt-1 text-xs text-faint">Mínimo 8 caracteres.</p>
            </div>
          )}

          {error && <div className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-3 text-sm text-[#F7A39A]">{error}</div>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? (isRegister ? 'Creando cuenta...' : 'Entrando...') : isRegister ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {isRegister ? '¿Ya tienes cuenta?' : '¿Todavía no tienes cuenta?'}{' '}
          <button type="button" className="font-semibold text-primary" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
            {isRegister ? 'Inicia sesión' : 'Crear cuenta'}
          </button>
        </p>
      </section>
    </main>
  );
}
