import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/**
 * Valida el cuerpo o la query con un esquema de @harmonyhub/contracts antes de entrar al controller:
 * el handler recibe el dato ya limpio y con su tipo. Si no pasa, responde 400 con el mensaje del primer
 * problema (el mismo formato que usaban los servicios), o `fallback` si zod no trae mensaje.
 *
 *   update(@Body(new ZodPipe(updateMeSchema)) body: UpdateMe)
 */
export class ZodPipe<Schema extends z.ZodType> implements PipeTransform<unknown, z.output<Schema>> {
  constructor(
    private readonly schema: Schema,
    private readonly fallback = 'Datos invalidos',
  ) {}

  transform(value: unknown): z.output<Schema> {
    return parseOrBadRequest(this.schema, value, this.fallback);
  }
}

/** Lo mismo que ZodPipe, para validar fuera de un controller (ej. el texto de un formulario multipart). */
export function parseOrBadRequest<Schema extends z.ZodType>(schema: Schema, value: unknown, fallback = 'Datos invalidos'): z.output<Schema> {
  const parsed = schema.safeParse(value ?? {});
  if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message || fallback);
  return parsed.data;
}
