/**
 * Guard defensivo antes de llamar a /items/reorder: deduplica y filtra valores vacios.
 * El backend ya valida la permutacion exacta (assertReorderPayloadValid); esto solo evita
 * mandar un payload obviamente corrupto si dnd-kit produce un array raro en un drag rapido.
 */
export function normalizeOrders(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}
