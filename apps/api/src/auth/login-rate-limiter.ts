import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

export class TooManyLoginAttemptsError extends Error {
  constructor(readonly retryAfterSec: number) {
    super(`Demasiados intentos de inicio de sesion. Intenta de nuevo en ${Math.max(1, Math.ceil(retryAfterSec / 60))} min.`);
  }
}

export type LoginLimiterOptions = { maxAttempts: number; windowMs: number; blockMs: number };

export const DEFAULT_LOGIN_LIMITS: LoginLimiterOptions = { maxAttempts: 5, windowMs: 15 * 60_000, blockMs: 15 * 60_000 };

export type AttemptState = { count: number; windowStart: Date; blockedUntil: Date | null };

/** Milisegundos que le quedan al bloqueo (0 si no esta bloqueada). */
export function remainingBlockMs(state: AttemptState | null, now: Date) {
  if (!state?.blockedUntil) return 0;
  return Math.max(0, state.blockedUntil.getTime() - now.getTime());
}

/**
 * Estado despues de un intento fallido: si la ventana ya paso (o el bloqueo anterior termino) se empieza de cero;
 * al llegar a `maxAttempts` fallos dentro de la ventana, la clave queda bloqueada `blockMs`.
 */
export function applyFailure(state: AttemptState | null, now: Date, options: LoginLimiterOptions): AttemptState {
  const windowExpired = !state || now.getTime() - state.windowStart.getTime() > options.windowMs;
  const blockEnded = Boolean(state?.blockedUntil && state.blockedUntil.getTime() <= now.getTime());
  const base = !state || windowExpired || blockEnded ? { count: 0, windowStart: now, blockedUntil: null } : state;
  const count = base.count + 1;
  return {
    count,
    windowStart: base.windowStart,
    blockedUntil: count >= options.maxAttempts ? new Date(now.getTime() + options.blockMs) : base.blockedUntil,
  };
}

/**
 * Limitador del login (ip + correo) guardado en Postgres, asi lo comparten todas las instancias de la API.
 * La clave se guarda como hash (no quedan correos ni ips en claro). Mismo comportamiento que tenia en memoria.
 */
@Injectable()
export class LoginRateLimiter {
  private readonly options: LoginLimiterOptions = DEFAULT_LOGIN_LIMITS;
  private readonly now: () => Date = () => new Date();

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  static key(ip: string | undefined, email: string) {
    return createHash('sha256').update(`${ip || 'unknown'}|${email.trim().toLowerCase()}`).digest('hex');
  }

  /** Lanza TooManyLoginAttemptsError si la clave esta bloqueada. */
  async assertAllowed(key: string) {
    const state = await this.prisma.loginAttempt.findUnique({ where: { keyHash: key } });
    const remainingMs = remainingBlockMs(state, this.now());
    if (remainingMs > 0) throw new TooManyLoginAttemptsError(Math.ceil(remainingMs / 1000));
  }

  /**
   * Suma un fallo. La fila se crea si falta y se bloquea con FOR UPDATE dentro de la transaccion, para que
   * dos instancias que fallan a la vez no se pisen el contador.
   */
  async registerFailure(key: string) {
    const now = this.now();
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`INSERT INTO "LoginAttempt" ("keyHash", "count", "windowStart", "updatedAt") VALUES (${key}, 0, ${now}, ${now}) ON CONFLICT ("keyHash") DO NOTHING`;
      const [state] = await tx.$queryRaw<AttemptState[]>`SELECT "count", "windowStart", "blockedUntil" FROM "LoginAttempt" WHERE "keyHash" = ${key} FOR UPDATE`;
      const next = applyFailure(state, now, this.options);
      await tx.loginAttempt.update({ where: { keyHash: key }, data: { ...next, updatedAt: now } });
    });
    // Limpieza oportunista: lo que no se toco en mas que una ventana + un bloqueo ya no cuenta para nada.
    const staleBefore = new Date(now.getTime() - this.options.windowMs - this.options.blockMs);
    await this.prisma.loginAttempt.deleteMany({ where: { updatedAt: { lt: staleBefore } } });
  }

  async registerSuccess(key: string) {
    await this.prisma.loginAttempt.deleteMany({ where: { keyHash: key } });
  }
}
