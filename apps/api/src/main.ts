import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const envPath = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')].find((path) => existsSync(path));
config(envPath ? { path: envPath } : undefined);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    },
  });

  app.setGlobalPrefix('');

  await app.listen(4000);
  console.log('HarmonyHub API listening on http://localhost:4000');
}

bootstrap();
