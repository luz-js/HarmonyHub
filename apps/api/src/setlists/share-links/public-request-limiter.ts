import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { applyFailure, remainingBlockMs, type AttemptState, type LoginLimiterOptions } from '../../auth/login-rate-limiter';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Por ip: hasta 60 solicitudes en 10 minutos; pasado eso, 10 minutos de espera. Una pagina compartida hace una sola
 * solicitud al abrirse, asi que alcanza de sobra para un equipo que recarga; frena a quien prueba tokens al azar.
 * PUBLIC_SHARE_MAX_REQUESTS cambia el tope (las pruebas lo bajan).
 */
export function publicLimits(): LoginLimiterOptions {
  const configured = Number(process.env.PUBLIC_SHARE_MAX_REQUESTS);
  return { maxAttempts: Number.isInteger(configured) && configured > 0 ? configured : 60, windowMs: 10 * 60_000, blockMs: 10 * 60_000 };
}

export const TOO_MANY_PUBLIC_REQUESTS_MESSAGE = 'Demasiadas solicitudes. Espera unos minutos e intenta de nuevo.';

/**
 * Limite de las rutas publicas guardado en Postgres (mismo esquema que el del login, en su propia tabla), asi lo
 * comparten todas las instancias de la API. Cada solicitud cuenta, sea el token valido o no.
 */
@Injectable()
export class PublicRequestLimiter {
  private readonly options = publicLimits();

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  static key(ip: string | undefined) {
    return createHash('sha256').update(`shared-setlist|${ip || 'unknown'}`).digest('hex');
  }

  /** Cuenta la solicitud; lanza 429 si la ip esta en espera (la que llega justo al tope todavia pasa). */
  async hit(ip: string | undefined, now = new Date()) {
    const key = PublicRequestLimiter.key(ip);
    const remainingMs = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`INSERT INTO "PublicRequestLimit" ("keyHash", "count", "windowStart", "updatedAt") VALUES (${key}, 0, ${now}, ${now}) ON CONFLICT ("keyHash") DO NOTHING`;
      const [state] = await tx.$queryRaw<AttemptState[]>`SELECT "count", "windowStart", "blockedUntil" FROM "PublicRequestLimit" WHERE "keyHash" = ${key} FOR UPDATE`;
      const blockedMs = remainingBlockMs(state, now);
      if (blockedMs > 0) return blockedMs;
      await tx.publicRequestLimit.update({ where: { keyHash: key }, data: { ...applyFailure(state, now, this.options), updatedAt: now } });
      return 0;
    });
    if (remainingMs > 0) {
      throw new HttpException({ message: TOO_MANY_PUBLIC_REQUESTS_MESSAGE, retryAfterSec: Math.ceil(remainingMs / 1000) }, HttpStatus.TOO_MANY_REQUESTS);
    }
    // Limpieza oportunista de ips que ya no cuentan para nada.
    const staleBefore = new Date(now.getTime() - this.options.windowMs - this.options.blockMs);
    await this.prisma.publicRequestLimit.deleteMany({ where: { updatedAt: { lt: staleBefore } } });
  }
}
