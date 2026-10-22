import type { SetlistMusicalRole } from '@prisma/client';

export type InstrumentInput = { instrument: SetlistMusicalRole; isPrimary?: boolean };

/** Deja exactamente un principal cuando la lista no esta vacia: si nadie lo marco, el primero lo es. */
export function normalizeInstruments(instruments: InstrumentInput[]): { instrument: SetlistMusicalRole; isPrimary: boolean }[] {
  const hasPrimary = instruments.some((item) => item.isPrimary);
  return instruments.map((item, index) => ({ instrument: item.instrument, isPrimary: hasPrimary ? Boolean(item.isPrimary) : index === 0 }));
}

/** Orden de presentacion: el principal primero y luego en el orden en que se agregaron. */
export function sortInstruments<T extends { isPrimary: boolean; createdAt: Date }>(instruments: T[]): T[] {
  return [...instruments].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.createdAt.getTime() - b.createdAt.getTime());
}
