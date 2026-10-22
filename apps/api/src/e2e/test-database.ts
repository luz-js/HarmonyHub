import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { Client } from 'pg';

const REPO_ROOT = resolve(__dirname, '../../../..');

export const MISSING_TEST_DATABASE_MESSAGE =
  'TEST_DATABASE_URL no esta definido: se omiten las pruebas e2e. Ejemplo: TEST_DATABASE_URL="postgresql://postgres:admin@localhost:5432/harmonyhub_test"';

function databaseName(url: string) {
  return new URL(url).pathname.replace(/^\//, '');
}

/**
 * Devuelve la URL de la base de pruebas o null si no esta configurada. Se niega a usar una base que
 * no tenga "test" en el nombre o que sea la misma de DATABASE_URL: estas pruebas BORRAN los datos.
 */
export function getTestDatabaseUrl() {
  const url = process.env.TEST_DATABASE_URL?.trim();
  if (!url) return null;

  const name = databaseName(url);
  if (!/test/i.test(name)) {
    throw new Error(`TEST_DATABASE_URL apunta a "${name}": por seguridad el nombre de la base de pruebas debe contener "test".`);
  }
  const devUrl = process.env.DATABASE_URL?.trim();
  if (devUrl && devUrl !== url && databaseName(devUrl) === name && new URL(devUrl).host === new URL(url).host) {
    throw new Error('TEST_DATABASE_URL apunta a la misma base que DATABASE_URL; usa una base de pruebas separada.');
  }
  return url;
}

/** Aplica el esquema de Prisma a la base de pruebas (nunca a la de desarrollo). */
export function pushSchema(url: string) {
  execSync('npx prisma db push', { cwd: REPO_ROOT, env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
}

/** Vacia todas las tablas de la base de pruebas. */
export async function truncateAll(url: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'");
    if (rows.length > 0) await client.query(`TRUNCATE ${rows.map((row) => `"${row.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  } finally {
    await client.end();
  }
}
