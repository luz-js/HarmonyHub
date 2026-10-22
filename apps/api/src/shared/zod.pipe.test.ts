import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodPipe } from './zod.pipe';

const schema = z.object({ name: z.string().trim().min(1, 'El nombre es requerido') });

test('ZodPipe devuelve el dato limpio y, sin cuerpo, valida un objeto vacio', () => {
  assert.deepEqual(new ZodPipe(schema).transform({ name: '  Ana ' }), { name: 'Ana' });
  assert.throws(() => new ZodPipe(schema).transform(undefined), (error: unknown) => error instanceof BadRequestException && error.message === 'Invalid input: expected string, received undefined');
});

test('ZodPipe responde 400 con el mensaje del primer problema, o el de respaldo', () => {
  assert.throws(() => new ZodPipe(schema).transform({ name: ' ' }), (error: unknown) => error instanceof BadRequestException && error.message === 'El nombre es requerido');
  const silent = z.unknown().refine(() => false, { message: '' });
  assert.throws(() => new ZodPipe(silent, 'Filtros invalidos').transform({}), (error: unknown) => error instanceof BadRequestException && error.message === 'Filtros invalidos');
});
