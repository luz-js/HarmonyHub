import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

export type AuthTokenPayload = {
  sub: string;
  email: string;
  exp: number;
};

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

@Injectable()
export class JwtService {
  private readonly secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'harmonyhub-dev-secret-change-me';
  /** Access token de vida corta: cuando vence, la web lo renueva con el refresh token (cookie). */
  private readonly ttlSeconds = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 15 * 60);

  sign(payload: Pick<AuthTokenPayload, 'sub' | 'email'>) {
    const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64Url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + this.ttlSeconds }));
    const signature = this.signature(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }

  verify(token: string): AuthTokenPayload {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) throw new UnauthorizedException('Token invalido');

    const expected = this.signature(`${header}.${body}`);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
      throw new UnauthorizedException('Token invalido');
    }

    const payload = JSON.parse(decodeBase64Url(body)) as AuthTokenPayload;
    if (!payload.sub || !payload.email || !payload.exp) throw new UnauthorizedException('Token invalido');
    if (payload.exp < Math.floor(Date.now() / 1000)) throw new UnauthorizedException('Token expirado');
    return payload;
  }

  private signature(value: string) {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }
}
