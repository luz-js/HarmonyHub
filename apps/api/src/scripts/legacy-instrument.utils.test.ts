import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapLegacyInstrument } from './legacy-instrument.utils';

test('mapLegacyInstrument traduce los textos de la base local al enum', () => {
  assert.equal(mapLegacyInstrument('Voz'), 'LEAD_VOCAL');
  assert.equal(mapLegacyInstrument('Guitarra'), 'ACOUSTIC_GUITAR');
  assert.equal(mapLegacyInstrument('Teclado'), 'KEYS');
  assert.equal(mapLegacyInstrument('Dirección'), 'MUSIC_DIRECTOR');
});

test('mapLegacyInstrument ignora mayusculas, acentos, espacios y texto mal codificado', () => {
  assert.equal(mapLegacyInstrument('  GUITARRA   eléctrica '), 'ELECTRIC_GUITAR');
  assert.equal(mapLegacyInstrument('DirecciÃ³n'), 'MUSIC_DIRECTOR');
  assert.equal(mapLegacyInstrument('Batería'), 'DRUMS');
});

test('mapLegacyInstrument devuelve null si no hay texto o no hay equivalencia', () => {
  assert.equal(mapLegacyInstrument(null), null);
  assert.equal(mapLegacyInstrument('   '), null);
  assert.equal(mapLegacyInstrument('Kazoo'), null);
});
