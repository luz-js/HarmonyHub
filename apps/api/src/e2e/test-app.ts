import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { pushSchema, truncateAll } from './test-database';

export type TestApp = { app: INestApplication; prisma: PrismaService; baseUrl: string; sign: (actor: { userId: string; email: string }) => string };

/**
 * Levanta la API real (AppModule con sus guards) contra la base de pruebas, ya vacia y con el esquema al dia.
 * DATABASE_URL se cambia antes de importar la app: Prisma nunca ve la base de desarrollo.
 */
export async function startTestApp(testDatabaseUrl: string): Promise<TestApp> {
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.JWT_SECRET ||= 'e2e-secret';
  pushSchema(testDatabaseUrl);
  await truncateAll(testDatabaseUrl);

  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('../app.module');
  const { JwtService } = await import('../auth/jwt.service');
  const { PrismaService } = await import('../prisma/prisma.service');

  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0);
  const jwt = app.get(JwtService);
  return {
    app,
    prisma: app.get(PrismaService),
    baseUrl: (await app.getUrl()).replace('[::1]', 'localhost'),
    sign: (actor) => jwt.sign({ sub: actor.userId, email: actor.email }),
  };
}
