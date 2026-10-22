import { z } from 'zod';

/** Los parametros de la query llegan como texto: "true"/"1" es si, "false"/"0" es no; vacio o cualquier otra cosa, sin valor. */
export function parseBooleanQueryParam(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
}

/** Un booleano de la query (?includeArchived=true), interpretado con parseBooleanQueryParam. */
export function booleanQueryParam<Schema extends z.ZodType>(schema: Schema) {
  return z.preprocess(parseBooleanQueryParam, schema);
}
