import type { z } from 'zod';
import { parseOrBadRequest } from './zod.pipe';

/**
 * Para pruebas unitarias de servicios: hace lo mismo que la API real, donde ZodPipe valida el cuerpo antes de
 * llamar al servicio. Un cuerpo invalido termina en una promesa rechazada con BadRequestException.
 */
export function viaPipe<Schema extends z.ZodType, Result>(schema: Schema, raw: unknown, call: (data: z.output<Schema>) => Promise<Result>) {
  return Promise.resolve().then(() => call(parseOrBadRequest(schema, raw)));
}
