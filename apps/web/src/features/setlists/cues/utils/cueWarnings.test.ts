import { describe, expect, it } from 'vitest';
import { makeSetlistCue } from '../test-utils/makeSetlistCue';
import { buildCueWarnings } from './cueWarnings';

describe('buildCueWarnings', () => {
  it('cue critico sin responsable', () => {
    const warnings = buildCueWarnings([makeSetlistCue({ priority: 'CRITICAL', responsibleParticipant: null })], [], []);
    expect(warnings.some((w) => w.code === 'CRITICAL_WITHOUT_RESPONSIBLE')).toBe(true);
  });

  it('cue bloqueado', () => {
    const warnings = buildCueWarnings([makeSetlistCue({ status: 'BLOCKED' })], [], []);
    expect(warnings.some((w) => w.code === 'BLOCKED')).toBe(true);
  });

  it('offset DURING mas alla de la duracion efectiva del item', () => {
    const cue = makeSetlistCue({ setlistItemId: 'item1', phase: 'DURING', offsetSec: 300 });
    const warnings = buildCueWarnings([cue], [{ id: 'item1', isHidden: false, effective: { durationSec: 200 } }], []);
    expect(warnings.some((w) => w.code === 'OFFSET_BEYOND_DURATION')).toBe(true);
  });

  it('item oculto', () => {
    const cue = makeSetlistCue({ setlistItemId: 'item1', phase: 'BEFORE' });
    const warnings = buildCueWarnings([cue], [{ id: 'item1', isHidden: true, effective: { durationSec: 200 } }], []);
    expect(warnings.some((w) => w.code === 'HIDDEN_ITEM')).toBe(true);
  });

  it('responsable con participacion rechazada', () => {
    const cue = makeSetlistCue({
      responsibleParticipant: {
        id: 'p1',
        status: 'DECLINED',
        membership: { id: 'm1', instrument: null, user: { id: 'u1', name: 'Ana', avatarUrl: null } },
      },
    });
    const warnings = buildCueWarnings([cue], [], [{ id: 'p1', status: 'DECLINED' }]);
    expect(warnings.some((w) => w.code === 'DECLINED_RESPONSIBLE')).toBe(true);
  });

  it('duplicado probable (mismo item+fase+tipo+offset+titulo normalizado)', () => {
    const shared = { setlistItemId: 'item1', phase: 'BEFORE' as const, type: 'CLICK_START' as const, offsetSec: -8, title: 'Iniciar click' };
    const cues = [makeSetlistCue(shared), makeSetlistCue({ ...shared, title: '  Iniciar   click  ' })];
    const warnings = buildCueWarnings(cues, [], []);
    expect(warnings.filter((w) => w.code === 'PROBABLE_DUPLICATE')).toHaveLength(1);
  });

  it('sin condiciones no genera warnings', () => {
    const warnings = buildCueWarnings([makeSetlistCue({ status: 'READY', priority: 'LOW' })], [], []);
    expect(warnings).toEqual([]);
  });
});
