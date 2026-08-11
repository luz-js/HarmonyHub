import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildCueWarnings,
  calculateCueTimelinePosition,
  calculateItemStartTimes,
  getCueCategory,
  getCueMetadataSchema,
  isCriticalPriority,
  normalizePhaseForItem,
  SETLIST_CUE_TYPES,
} from './setlist-cue.utils';

test('getCueCategory clasifica cada SetlistCueType en exactamente una categoria', () => {
  const expected: Record<string, string> = {
    COUNT_IN: 'MUSICAL', MUSIC_ENTRY: 'MUSICAL', DYNAMICS_UP: 'MUSICAL', ENDING: 'MUSICAL',
    CLICK_START: 'TRACKS', PAD_START: 'TRACKS', TRACK_STOP: 'TRACKS',
    SPEAKING: 'SPEAKING', PRAYER: 'SPEAKING', ANNOUNCEMENT: 'SPEAKING', SILENCE: 'SPEAKING',
    VIDEO_START: 'VIDEO', SLIDE_CHANGE: 'VIDEO',
    LIGHTS_SCENE: 'LIGHTING', LIGHTS_BLACKOUT: 'LIGHTING',
    AUDIO_LEVEL: 'AUDIO', MONITOR_CHANGE: 'AUDIO',
    INSTRUMENT_CHANGE: 'INSTRUMENT', CAPO_CHANGE: 'INSTRUMENT', PATCH_CHANGE: 'INSTRUMENT',
    ENTER_STAGE: 'LOGISTICS', TIMER: 'LOGISTICS', MARKER: 'LOGISTICS',
    CUSTOM: 'CUSTOM',
  };
  for (const [type, category] of Object.entries(expected)) {
    assert.equal(getCueCategory(type as any), category, `${type} deberia ser ${category}`);
  }
});

test('getCueCategory cubre los 44 SetlistCueType sin lanzar', () => {
  for (const type of SETLIST_CUE_TYPES) {
    assert.ok(getCueCategory(type), `getCueCategory(${type}) no deberia ser undefined`);
  }
});

test('isCriticalPriority solo es true para CRITICAL', () => {
  assert.equal(isCriticalPriority('CRITICAL'), true);
  assert.equal(isCriticalPriority('HIGH'), false);
  assert.equal(isCriticalPriority('NORMAL'), false);
  assert.equal(isCriticalPriority('LOW'), false);
});

test('normalizePhaseForItem: sin setlistItemId siempre GLOBAL', () => {
  assert.equal(normalizePhaseForItem(null, 'BEFORE'), 'GLOBAL');
  assert.equal(normalizePhaseForItem(undefined, 'DURING'), 'GLOBAL');
});

test('normalizePhaseForItem: con setlistItemId, GLOBAL cae a BEFORE y el resto se conserva', () => {
  assert.equal(normalizePhaseForItem('item1', 'GLOBAL'), 'BEFORE');
  assert.equal(normalizePhaseForItem('item1', 'DURING'), 'DURING');
  assert.equal(normalizePhaseForItem('item1', 'AFTER'), 'AFTER');
});

test('calculateCueTimelinePosition: GLOBAL usa offset desde el inicio del setlist', () => {
  assert.equal(calculateCueTimelinePosition({ phase: 'GLOBAL', offsetSec: 300, itemStartSec: null, itemDurationSec: null }), 300);
  assert.equal(calculateCueTimelinePosition({ phase: 'GLOBAL', offsetSec: null, itemStartSec: null, itemDurationSec: null }), 0);
});

test('calculateCueTimelinePosition: BEFORE/DURING = itemStartSec + offsetSec', () => {
  assert.equal(calculateCueTimelinePosition({ phase: 'BEFORE', offsetSec: -8, itemStartSec: 330, itemDurationSec: 260 }), 322);
  assert.equal(calculateCueTimelinePosition({ phase: 'DURING', offsetSec: 80, itemStartSec: 330, itemDurationSec: 260 }), 410);
});

test('calculateCueTimelinePosition: AFTER = itemStartSec + itemDurationSec + offsetSec', () => {
  assert.equal(calculateCueTimelinePosition({ phase: 'AFTER', offsetSec: 5, itemStartSec: 330, itemDurationSec: 260 }), 595);
});

test('calculateCueTimelinePosition: BEFORE/DURING/AFTER sin itemStartSec -> null (item desconocido)', () => {
  assert.equal(calculateCueTimelinePosition({ phase: 'BEFORE', offsetSec: 0, itemStartSec: null, itemDurationSec: null }), null);
});

test('calculateItemStartTimes: acumula duracion efectiva; items ocultos heredan el reloj sin avanzarlo', () => {
  const starts = calculateItemStartTimes([
    { id: 'a', isHidden: false, estimatedSec: 200 },
    { id: 'hidden', isHidden: true, estimatedSec: 999 },
    { id: 'b', isHidden: false, durationOverrideSec: 180 },
    { id: 'c', isHidden: false, songVersion: { durationSec: 240 } },
  ]);
  assert.equal(starts.get('a'), 0);
  assert.equal(starts.get('hidden'), 200);
  assert.equal(starts.get('b'), 200);
  assert.equal(starts.get('c'), 380);
});

test('getCueMetadataSchema: COUNT_IN valida count requerido 1-16', () => {
  const schema = getCueMetadataSchema('COUNT_IN');
  assert.equal(schema.safeParse({ count: 4, subdivision: 'QUARTER' }).success, true);
  assert.equal(schema.safeParse({ count: 0 }).success, false);
  assert.equal(schema.safeParse({}).success, false);
});

test('getCueMetadataSchema: LIGHTS_SCENE exige sceneName', () => {
  const schema = getCueMetadataSchema('LIGHTS_SCENE');
  assert.equal(schema.safeParse({ sceneName: 'Azul 01', fadeSec: 3 }).success, true);
  assert.equal(schema.safeParse({ fadeSec: 3 }).success, false);
});

test('getCueMetadataSchema: tipos sin schema especifico aceptan objeto generico', () => {
  const schema = getCueMetadataSchema('MARKER');
  assert.equal(schema.safeParse({ anything: 'goes', nested: { ok: true } }).success, true);
});

test('buildCueWarnings: cue critico sin responsable', () => {
  const warnings = buildCueWarnings(
    [{ id: 'c1', setlistItemId: null, phase: 'GLOBAL', type: 'CUSTOM', title: 'Abrir puertas', offsetSec: 0, status: 'PENDING', priority: 'CRITICAL', responsibleParticipantId: null }],
    [],
    [],
  );
  assert.ok(warnings.some((w) => w.cueId === 'c1' && w.code === 'CRITICAL_WITHOUT_RESPONSIBLE'));
});

test('buildCueWarnings: cue bloqueado', () => {
  const warnings = buildCueWarnings(
    [{ id: 'c1', setlistItemId: null, phase: 'GLOBAL', type: 'CUSTOM', title: 'x', offsetSec: 0, status: 'BLOCKED', priority: 'NORMAL', responsibleParticipantId: null }],
    [],
    [],
  );
  assert.ok(warnings.some((w) => w.code === 'BLOCKED'));
});

test('buildCueWarnings: offset DURING mas alla de la duracion efectiva del item', () => {
  const warnings = buildCueWarnings(
    [{ id: 'c1', setlistItemId: 'item1', phase: 'DURING', type: 'CLICK_START', title: 'x', offsetSec: 300, status: 'PENDING', priority: 'NORMAL', responsibleParticipantId: null }],
    [{ id: 'item1', isHidden: false, effective: { durationSec: 200 } }],
    [],
  );
  assert.ok(warnings.some((w) => w.code === 'OFFSET_BEYOND_DURATION'));
});

test('buildCueWarnings: item oculto', () => {
  const warnings = buildCueWarnings(
    [{ id: 'c1', setlistItemId: 'item1', phase: 'BEFORE', type: 'CUSTOM', title: 'x', offsetSec: 0, status: 'PENDING', priority: 'NORMAL', responsibleParticipantId: null }],
    [{ id: 'item1', isHidden: true, effective: { durationSec: 200 } }],
    [],
  );
  assert.ok(warnings.some((w) => w.code === 'HIDDEN_ITEM'));
});

test('buildCueWarnings: responsable con participacion rechazada (DECLINED)', () => {
  const warnings = buildCueWarnings(
    [{ id: 'c1', setlistItemId: null, phase: 'GLOBAL', type: 'CUSTOM', title: 'x', offsetSec: 0, status: 'PENDING', priority: 'NORMAL', responsibleParticipantId: 'p1' }],
    [],
    [{ id: 'p1', status: 'DECLINED' }],
  );
  assert.ok(warnings.some((w) => w.code === 'DECLINED_RESPONSIBLE'));
});

test('buildCueWarnings: duplicado probable (mismo item+fase+tipo+offset+titulo)', () => {
  const cue = { setlistItemId: 'item1', phase: 'BEFORE' as const, type: 'CLICK_START' as const, title: 'Iniciar click', offsetSec: -8, status: 'PENDING' as const, priority: 'NORMAL' as const, responsibleParticipantId: null };
  const warnings = buildCueWarnings([{ id: 'c1', ...cue }, { id: 'c2', ...cue, title: '  Iniciar   click  ' }], [], []);
  assert.equal(warnings.filter((w) => w.code === 'PROBABLE_DUPLICATE').length, 1);
  assert.ok(warnings.some((w) => w.cueId === 'c2' && w.code === 'PROBABLE_DUPLICATE'));
});

test('buildCueWarnings: sin condiciones no genera warnings', () => {
  const warnings = buildCueWarnings(
    [{ id: 'c1', setlistItemId: null, phase: 'GLOBAL', type: 'CUSTOM', title: 'x', offsetSec: 0, status: 'READY', priority: 'LOW', responsibleParticipantId: null }],
    [],
    [],
  );
  assert.deepEqual(warnings, []);
});
