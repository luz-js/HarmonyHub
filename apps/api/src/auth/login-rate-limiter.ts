export class TooManyLoginAttemptsError extends Error {
  constructor(readonly retryAfterSec: number) {
    super(`Demasiados intentos de inicio de sesion. Intenta de nuevo en ${Math.max(1, Math.ceil(retryAfterSec / 60))} min.`);
  }
}

type AttemptWindow = { count: number; firstAttemptAt: number; blockedUntil?: number };

/**
 * Limitador en memoria para el login: tras `maxAttempts` fallos dentro de `windowMs`
 * la clave (ip + correo) queda bloqueada `blockMs`. Un login exitoso limpia la clave.
 * Vive en el proceso: alcanza para una sola instancia; con varias habra que moverlo a Redis.
 */
export class LoginRateLimiter {
  private readonly attempts = new Map<string, AttemptWindow>();

  constructor(
    private readonly options: { maxAttempts: number; windowMs: number; blockMs: number } = { maxAttempts: 5, windowMs: 15 * 60_000, blockMs: 15 * 60_000 },
    private readonly now: () => number = Date.now,
  ) {}

  static key(ip: string | undefined, email: string) {
    return `${ip || 'unknown'}|${email.trim().toLowerCase()}`;
  }

  /** Lanza TooManyLoginAttemptsError si la clave esta bloqueada. */
  assertAllowed(key: string) {
    const entry = this.attempts.get(key);
    if (!entry?.blockedUntil) return;
    const remainingMs = entry.blockedUntil - this.now();
    if (remainingMs > 0) throw new TooManyLoginAttemptsError(Math.ceil(remainingMs / 1000));
    this.attempts.delete(key);
  }

  registerFailure(key: string) {
    const current = this.now();
    const entry = this.attempts.get(key);
    if (!entry || current - entry.firstAttemptAt > this.options.windowMs) {
      this.attempts.set(key, { count: 1, firstAttemptAt: current });
      return;
    }
    entry.count += 1;
    if (entry.count >= this.options.maxAttempts) entry.blockedUntil = current + this.options.blockMs;
  }

  registerSuccess(key: string) {
    this.attempts.delete(key);
  }
}
