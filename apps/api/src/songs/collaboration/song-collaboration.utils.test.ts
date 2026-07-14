import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertValidThreadTarget, InvalidThreadTargetError, normalizeMentionedUserIds, sectionExistsInContent } from './song-collaboration.utils';

test('assertValidThreadTarget exige versionId y targetRef para SECTION', () => {
  assert.throws(() => assertValidThreadTarget('SECTION', null, 'section-1'), InvalidThreadTargetError);
  assert.throws(() => assertValidThreadTarget('SECTION', 'version-1', null), InvalidThreadTargetError);
  assert.throws(() => assertValidThreadTarget('SECTION', 'version-1', '   '), InvalidThreadTargetError);
  assert.doesNotThrow(() => assertValidThreadTarget('SECTION', 'version-1', 'section-1'));
});

test('assertValidThreadTarget exige versionId para VERSION', () => {
  assert.throws(() => assertValidThreadTarget('VERSION', null, null), InvalidThreadTargetError);
  assert.doesNotThrow(() => assertValidThreadTarget('VERSION', 'version-1', null));
});

test('assertValidThreadTarget no exige nada extra para SONG', () => {
  assert.doesNotThrow(() => assertValidThreadTarget('SONG', null, null));
});

test('sectionExistsInContent encuentra la seccion por id', () => {
  const content = { sections: [{ id: 'section-1', name: 'Verso 1' }, { id: 'section-2', name: 'Coro' }] };
  assert.equal(sectionExistsInContent(content, 'section-2'), true);
  assert.equal(sectionExistsInContent(content, 'section-3'), false);
  assert.equal(sectionExistsInContent(null, 'section-1'), false);
  assert.equal(sectionExistsInContent({}, 'section-1'), false);
});

test('normalizeMentionedUserIds deduplica y filtra valores invalidos', () => {
  assert.deepEqual(normalizeMentionedUserIds(['user-1', 'user-2', 'user-1']), ['user-1', 'user-2']);
  assert.deepEqual(normalizeMentionedUserIds(['user-1', '', 42, null]), ['user-1']);
  assert.deepEqual(normalizeMentionedUserIds(undefined), []);
});
