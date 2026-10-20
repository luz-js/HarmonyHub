import { describe, expect, it } from 'vitest';
import { buildCreateSetlistInput, toTemplateOptions } from './setlist.utils';

describe('toTemplateOptions', () => {
  it('solo devuelve plantillas con id, nombre y descripcion', () => {
    const options = toTemplateOptions([
      { id: 't1', name: 'Domingo base', description: 'Estructura del culto', isTemplate: true },
      { id: 's1', name: 'Culto 20 julio', description: null, isTemplate: false },
    ]);
    expect(options).toEqual([{ id: 't1', name: 'Domingo base', description: 'Estructura del culto' }]);
  });
});

describe('buildCreateSetlistInput', () => {
  it('devuelve null si el nombre esta vacio', () => {
    expect(buildCreateSetlistInput({ name: '   ', description: '' })).toBeNull();
  });

  it('recorta textos y omite descripcion vacia', () => {
    expect(buildCreateSetlistInput({ name: '  Culto  ', description: '  ' })).toEqual({ name: 'Culto', description: undefined });
  });

  it('incluye sourceTemplateId solo cuando se eligio una plantilla', () => {
    expect(buildCreateSetlistInput({ name: 'Culto', description: 'x', sourceTemplateId: 't1' })).toEqual({
      name: 'Culto',
      description: 'x',
      sourceTemplateId: 't1',
    });
    expect(buildCreateSetlistInput({ name: 'Culto', description: 'x', sourceTemplateId: null })).not.toHaveProperty('sourceTemplateId');
  });
});
