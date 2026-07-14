import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertReorderPayloadValid,
  assertSetlistStatusTransition,
  calculateSetlistEstimatedSec,
  computeInsertOrder,
  InvalidSetlistStatusTransitionError,
  normalizeSetlistItemInput,
  resolveSetlistItemEffectiveValues,
} from './setlist.utils';

test('resolveSetlistItemEffectiveValues usa override cuando existe, si no cae a la version', () => {
  const version = { key: 'D', bpm: 72, durationSec: 260 };
  assert.deepEqual(resolveSetlistItemEffectiveValues({}, version), { key: 'D', bpm: 72, durationSec: 260, capo: null });
  assert.deepEqual(resolveSetlistItemEffectiveValues({ keyOverride: 'C', bpmOverride: 90 }, version), { key: 'C', bpm: 90, durationSec: 260, capo: null });
});

test('resolveSetlistItemEffectiveValues: durationOverrideSec > estimatedSec > songVersion.durationSec', () => {
  const version = { durationSec: 260 };
  assert.equal(resolveSetlistItemEffectiveValues({ estimatedSec: 200 }, version).durationSec, 200);
  assert.equal(resolveSetlistItemEffectiveValues({ durationOverrideSec: 300, estimatedSec: 200 }, version).durationSec, 300);
  assert.equal(resolveSetlistItemEffectiveValues({}, undefined).durationSec, null);
});

test('resolveSetlistItemEffectiveValues sin SongVersion (item no musical) usa solo lo propio del item', () => {
  assert.deepEqual(resolveSetlistItemEffectiveValues({ estimatedSec: 90 }), { key: null, bpm: null, durationSec: 90, capo: null });
});

test('normalizeSetlistItemInput conserva campos musicales para SONG', () => {
  const input = { songId: 's1', songVersionId: 'v1', keyOverride: 'C', bpmOverride: 90, capo: 2, includeClick: true };
  assert.deepEqual(normalizeSetlistItemInput('SONG', input), input);
});

test('normalizeSetlistItemInput limpia campos musicales para tipos no SONG', () => {
  const input = { songId: 's1', songVersionId: 'v1', keyOverride: 'C', bpmOverride: 90, capo: 2, includeClick: true, includePad: true, title: 'Oracion' };
  const normalized = normalizeSetlistItemInput('PRAYER', input);
  assert.equal(normalized.songId, null);
  assert.equal(normalized.songVersionId, null);
  assert.equal(normalized.keyOverride, null);
  assert.equal(normalized.bpmOverride, null);
  assert.equal(normalized.capo, null);
  assert.equal(normalized.includeClick, false);
  assert.equal(normalized.includePad, false);
  assert.equal(normalized.title, 'Oracion');
});

test('assertSetlistStatusTransition permite el flujo documentado', () => {
  assert.doesNotThrow(() => assertSetlistStatusTransition('DRAFT', 'READY'));
  assert.doesNotThrow(() => assertSetlistStatusTransition('READY', 'PUBLISHED'));
  assert.doesNotThrow(() => assertSetlistStatusTransition('PUBLISHED', 'READY'));
  assert.doesNotThrow(() => assertSetlistStatusTransition('READY', 'DRAFT'));
  assert.doesNotThrow(() => assertSetlistStatusTransition('ARCHIVED', 'DRAFT'));
  assert.doesNotThrow(() => assertSetlistStatusTransition('DRAFT', 'DRAFT'));
});

test('assertSetlistStatusTransition rechaza saltos invalidos', () => {
  assert.throws(() => assertSetlistStatusTransition('DRAFT', 'PUBLISHED'), InvalidSetlistStatusTransitionError);
  assert.throws(() => assertSetlistStatusTransition('ARCHIVED', 'PUBLISHED'), InvalidSetlistStatusTransitionError);
});

test('assertReorderPayloadValid detecta duplicados y listas incompletas', () => {
  assert.throws(() => assertReorderPayloadValid(['a', 'a', 'b'], ['a', 'b']));
  assert.throws(() => assertReorderPayloadValid(['a'], ['a', 'b']));
  assert.throws(() => assertReorderPayloadValid(['a', 'b', 'c'], ['a', 'b']));
  assert.doesNotThrow(() => assertReorderPayloadValid(['b', 'a'], ['a', 'b']));
});

test('calculateSetlistEstimatedSec excluye items ocultos y respeta la cascada de duracion', () => {
  const items = [
    { isHidden: false, durationOverrideSec: 300 },
    { isHidden: false, estimatedSec: 90 },
    { isHidden: false, songVersion: { durationSec: 260 } },
    { isHidden: true, songVersion: { durationSec: 1000 } },
  ];
  assert.equal(calculateSetlistEstimatedSec(items), 300 + 90 + 260);
});

test('computeInsertOrder sin insertIndex no reordena (preserva append al final)', () => {
  assert.deepEqual(computeInsertOrder(['a', 'b', 'new'], 'new', null), ['a', 'b', 'new']);
  assert.deepEqual(computeInsertOrder(['a', 'b', 'new'], 'new', undefined), ['a', 'b', 'new']);
});

test('computeInsertOrder inserta al inicio', () => {
  assert.deepEqual(computeInsertOrder(['a', 'b', 'new'], 'new', 0), ['new', 'a', 'b']);
});

test('computeInsertOrder inserta en el medio', () => {
  assert.deepEqual(computeInsertOrder(['a', 'b', 'c', 'new'], 'new', 1), ['a', 'new', 'b', 'c']);
});

test('computeInsertOrder inserta al final cuando el indice es igual o mayor a la longitud sin el nuevo item', () => {
  assert.deepEqual(computeInsertOrder(['a', 'b', 'new'], 'new', 2), ['a', 'b', 'new']);
  assert.deepEqual(computeInsertOrder(['a', 'b', 'new'], 'new', 99), ['a', 'b', 'new']);
});

test('computeInsertOrder no permite indices negativos (clampa a 0)', () => {
  assert.deepEqual(computeInsertOrder(['a', 'b', 'new'], 'new', -5), ['new', 'a', 'b']);
});
