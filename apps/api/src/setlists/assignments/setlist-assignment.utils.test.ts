import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeCoverage, isSinglePrimaryRole, matchesCopyMode, resetPreparationForCopy, ROLES_BY_ITEM_TYPE } from './setlist-assignment.utils';

test('isSinglePrimaryRole identifica los roles de principal unico', () => {
  assert.equal(isSinglePrimaryRole('LEAD_VOCAL'), true);
  assert.equal(isSinglePrimaryRole('MUSIC_DIRECTOR'), true);
  assert.equal(isSinglePrimaryRole('BACKING_VOCAL'), false);
  assert.equal(isSinglePrimaryRole('CHOIR'), false);
});

test('ROLES_BY_ITEM_TYPE tiene una entrada por cada tipo de item y nunca esta vacia', () => {
  const types: Array<keyof typeof ROLES_BY_ITEM_TYPE> = ['SONG', 'SPEAKING', 'PRAYER', 'VIDEO', 'ANNOUNCEMENT', 'SILENCE', 'TRANSITION', 'BREAK', 'CUSTOM'];
  for (const type of types) {
    assert.ok(ROLES_BY_ITEM_TYPE[type].length > 0, `ROLES_BY_ITEM_TYPE.${type} no deberia estar vacio`);
  }
});

test('computeCoverage: sin requisitos y sin asignaciones -> EMPTY', () => {
  const coverage = computeCoverage([], []);
  assert.equal(coverage.status, 'EMPTY');
  assert.deepEqual(coverage.missingRoles, []);
});

test('computeCoverage: sin requisitos pero con al menos una asignacion -> COMPLETE', () => {
  const coverage = computeCoverage([{ role: 'LEAD_VOCAL' }], []);
  assert.equal(coverage.status, 'COMPLETE');
});

test('computeCoverage: con requisitos totalmente cubiertos -> COMPLETE', () => {
  const coverage = computeCoverage(
    [{ role: 'LEAD_VOCAL' }, { role: 'DRUMS' }],
    [{ role: 'LEAD_VOCAL', minimumCount: 1 }, { role: 'DRUMS', minimumCount: 1 }],
  );
  assert.equal(coverage.status, 'COMPLETE');
  assert.equal(coverage.missingRoles.length, 0);
});

test('computeCoverage: con algun requisito sin cubrir -> PARTIAL, lista el faltante', () => {
  const coverage = computeCoverage(
    [{ role: 'LEAD_VOCAL' }],
    [{ role: 'LEAD_VOCAL', minimumCount: 1 }, { role: 'DRUMS', minimumCount: 1, label: 'Bateria' }],
  );
  assert.equal(coverage.status, 'PARTIAL');
  assert.equal(coverage.missingRoles.length, 1);
  assert.equal(coverage.missingRoles[0].role, 'DRUMS');
  assert.equal(coverage.missingRoles[0].label, 'Bateria');
  assert.equal(coverage.missingRoles[0].requiredCount, 1);
  assert.equal(coverage.missingRoles[0].assignedCount, 0);
});

test('computeCoverage: con requisitos definidos pero ninguno cubierto -> EMPTY', () => {
  const coverage = computeCoverage([], [{ role: 'LEAD_VOCAL', minimumCount: 1 }]);
  assert.equal(coverage.status, 'EMPTY');
  assert.equal(coverage.coveredRoles, 0);
});

test('computeCoverage: minimumCount mayor a 1 exige varias asignaciones del mismo role', () => {
  const partial = computeCoverage([{ role: 'BACKING_VOCAL' }], [{ role: 'BACKING_VOCAL', minimumCount: 2 }]);
  assert.equal(partial.status, 'EMPTY');
  assert.equal(partial.missingRoles[0].assignedCount, 1);

  const complete = computeCoverage(
    [{ role: 'BACKING_VOCAL' }, { role: 'BACKING_VOCAL' }],
    [{ role: 'BACKING_VOCAL', minimumCount: 2 }],
  );
  assert.equal(complete.status, 'COMPLETE');
});

test('resetPreparationForCopy siempre devuelve PENDING, nunca copia READY', () => {
  assert.equal(resetPreparationForCopy('READY'), 'PENDING');
  assert.equal(resetPreparationForCopy('NEEDS_REVIEW'), 'PENDING');
  assert.equal(resetPreparationForCopy('PENDING'), 'PENDING');
});

test('matchesCopyMode: ALL copia cualquier role', () => {
  assert.equal(matchesCopyMode('LEAD_VOCAL', 'ALL'), true);
  assert.equal(matchesCopyMode('DRUMS', 'ALL'), true);
  assert.equal(matchesCopyMode('AUDIO_ENGINEER', 'ALL'), true);
});

test('matchesCopyMode: VOCALS_ONLY solo roles vocales', () => {
  assert.equal(matchesCopyMode('LEAD_VOCAL', 'VOCALS_ONLY'), true);
  assert.equal(matchesCopyMode('BACKING_VOCAL', 'VOCALS_ONLY'), true);
  assert.equal(matchesCopyMode('CHOIR', 'VOCALS_ONLY'), true);
  assert.equal(matchesCopyMode('DRUMS', 'VOCALS_ONLY'), false);
  assert.equal(matchesCopyMode('AUDIO_ENGINEER', 'VOCALS_ONLY'), false);
});

test('matchesCopyMode: TECH_ONLY solo roles tecnicos/produccion', () => {
  assert.equal(matchesCopyMode('AUDIO_ENGINEER', 'TECH_ONLY'), true);
  assert.equal(matchesCopyMode('CLICK', 'TECH_ONLY'), true);
  assert.equal(matchesCopyMode('TRACKS', 'TECH_ONLY'), true);
  assert.equal(matchesCopyMode('LEAD_VOCAL', 'TECH_ONLY'), false);
  assert.equal(matchesCopyMode('DRUMS', 'TECH_ONLY'), false);
});

test('matchesCopyMode: MUSICIANS_ONLY excluye vocales y tecnicos', () => {
  assert.equal(matchesCopyMode('DRUMS', 'MUSICIANS_ONLY'), true);
  assert.equal(matchesCopyMode('MUSIC_DIRECTOR', 'MUSICIANS_ONLY'), true);
  assert.equal(matchesCopyMode('LEAD_VOCAL', 'MUSICIANS_ONLY'), false);
  assert.equal(matchesCopyMode('AUDIO_ENGINEER', 'MUSICIANS_ONLY'), false);
});
