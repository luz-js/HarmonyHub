import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 86_400_000;

/**
 * Si dos pestañas renuevan casi a la vez, la segunda llega con el token que la primera acaba de rotar.
 * Dentro de esta ventana no se trata como robo: se emite otro token de la misma familia.
 */
export const ROTATION_GRACE_MS = 20_000;

export function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export type IssuedRefreshToken = { token: string; expiresAt: Date };

/**
 * Tokens de renovacion de sesion: aleatorios, de larga duracion y de un solo uso (rotan en cada renovacion).
 * Solo se guarda su hash. Reusar uno ya rotado (fuera de la ventana de gracia) revoca toda su familia.
 */
@Injectable()
export class RefreshTokenService {
  private readonly ttlMs = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30) * DAY_MS;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Empieza una familia nueva (login o registro). */
  async issue(userId: string, userAgent?: string | null): Promise<IssuedRefreshToken> {
    await this.deleteExpired(userId);
    const { token, data } = this.newToken(userId, randomUUID(), userAgent);
    await this.prisma.refreshToken.create({ data });
    return { token, expiresAt: data.expiresAt };
  }

  /** Cambia un token vigente por uno nuevo. Devuelve tambien de quien es, para firmar el access token. */
  async rotate(token: string | undefined | null, userAgent?: string | null): Promise<IssuedRefreshToken & { userId: string }> {
    if (!token) throw new UnauthorizedException('Sesion expirada');
    const current = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashRefreshToken(token) } });
    if (!current) throw new UnauthorizedException('Sesion expirada');

    const now = Date.now();
    if (current.replacedById || current.revokedAt) {
      const rotatedRecently = Boolean(current.replacedById && current.revokedAt && now - current.revokedAt.getTime() <= ROTATION_GRACE_MS);
      const familyAlive = rotatedRecently && (await this.prisma.refreshToken.count({ where: { familyId: current.familyId, revokedAt: null } })) > 0;
      if (familyAlive) {
        const { token: next, data } = this.newToken(current.userId, current.familyId, userAgent);
        await this.prisma.refreshToken.create({ data });
        return { userId: current.userId, token: next, expiresAt: data.expiresAt };
      }
      // Alguien uso un token viejo: puede ser robado. Se cierra toda la familia (esa sesion en todos lados).
      await this.revokeFamily(current.familyId);
      throw new UnauthorizedException('Sesion invalida, vuelve a iniciar sesion');
    }
    if (current.expiresAt.getTime() <= now) throw new UnauthorizedException('Sesion expirada');

    const { token: next, data } = this.newToken(current.userId, current.familyId, userAgent);
    await this.prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({ data });
      await tx.refreshToken.update({ where: { id: current.id }, data: { revokedAt: new Date(now), replacedById: created.id } });
    });
    return { userId: current.userId, token: next, expiresAt: data.expiresAt };
  }

  /** Cierra la sesion de este token (logout): revoca toda su familia. No falla si ya no existe. */
  async revoke(token: string | undefined | null) {
    if (!token) return;
    const current = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashRefreshToken(token) } });
    if (current) await this.revokeFamily(current.familyId);
  }

  private revokeFamily(familyId: string) {
    return this.prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  /** Los tokens vencidos de esta persona ya no sirven para nada. */
  private deleteExpired(userId: string) {
    return this.prisma.refreshToken.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  }

  /** El token en claro solo vive en la respuesta (cookie); en la base queda su hash. */
  private newToken(userId: string, familyId: string, userAgent?: string | null) {
    const token = randomBytes(32).toString('base64url');
    return {
      token,
      data: {
        userId,
        familyId,
        tokenHash: hashRefreshToken(token),
        expiresAt: new Date(Date.now() + this.ttlMs),
        userAgent: userAgent?.slice(0, 255) || null,
      },
    };
  }
}
