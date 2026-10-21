/**
 * Script de una sola vez: copia `Membership.instrument` (texto libre) a `UserInstrument` de esa persona.
 * Es seguro correrlo varias veces: no duplica ni cambia un principal que ya exista.
 *
 *   npx tsx apps/api/src/scripts/copy-membership-instruments.ts            # aplica
 *   npx tsx apps/api/src/scripts/copy-membership-instruments.ts --dry-run  # solo muestra lo que haria
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaService } from '../prisma/prisma.service';
import { mapLegacyInstrument } from './legacy-instrument.utils';

const envPath = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')].find((path) => existsSync(path));
config({ path: envPath, quiet: true });

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const prisma = new PrismaService();

  try {
    const memberships = await prisma.membership.findMany({
      where: { instrument: { not: null } },
      select: { userId: true, instrument: true },
      orderBy: { joinedAt: 'asc' },
    });

    let created = 0;
    for (const { userId, instrument: text } of memberships) {
      const instrument = mapLegacyInstrument(text);
      if (!instrument) {
        if (text?.trim()) console.log(`Sin equivalencia, se omite: "${text}"`);
        continue;
      }

      const existing = await prisma.userInstrument.findMany({ where: { userId }, select: { instrument: true, isPrimary: true } });
      if (existing.some((item) => item.instrument === instrument)) {
        console.log(`"${text}" -> ${instrument} (ya estaba)`);
        continue;
      }

      const isPrimary = !existing.some((item) => item.isPrimary);
      console.log(`"${text}" -> ${instrument}${isPrimary ? ' (principal)' : ''}${dryRun ? ' [dry-run]' : ''}`);
      if (!dryRun) {
        await prisma.userInstrument.create({ data: { userId, instrument, isPrimary } });
        created += 1;
      }
    }

    console.log(dryRun ? 'Dry-run: no se guardo nada.' : `Listo: ${created} instrumento(s) copiado(s).`);
  } finally {
    await prisma.onModuleDestroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
