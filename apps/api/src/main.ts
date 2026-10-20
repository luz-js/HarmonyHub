import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const envPath = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')].find((path) => existsSync(path));
config(envPath ? { path: envPath } : undefined);

const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

/** CORS_ORIGINS="https://app.ejemplo.com,https://admin.ejemplo.com"; vacio usa los origenes de desarrollo. */
function resolveCorsOrigins() {
  const configured = (process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_CORS_ORIGINS;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: resolveCorsOrigins(),
      credentials: true,
    },
  });

  app.setGlobalPrefix('');

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  console.log(`HarmonyHub API listening on http://localhost:${port}`);
}

bootstrap();
