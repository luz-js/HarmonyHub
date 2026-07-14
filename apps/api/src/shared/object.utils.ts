/** Elimina claves con valor `undefined` (deja pasar `null`) antes de un update de Prisma. */
export function clean<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}
