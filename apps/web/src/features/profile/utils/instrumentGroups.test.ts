import { describe, expect, it } from 'vitest';
import { ROLE_LABELS } from '../../setlists/assignments/utils/assignmentLabels';
import { INSTRUMENT_GROUPS, makePrimary, removeInstrument, toggleInstrument } from './instrumentGroups';

describe('instrumentGroups', () => {
  it('los grupos cubren los 30 roles, cada uno una sola vez', () => {
    const roles = INSTRUMENT_GROUPS.flatMap((group) => group.roles);
    expect(roles).toHaveLength(30);
    expect(new Set(roles).size).toBe(30);
    expect([...roles].sort()).toEqual(Object.keys(ROLE_LABELS).sort());
  });

  it('el primero que se agrega es principal; los siguientes no', () => {
    const one = toggleInstrument([], 'BASS');
    const two = toggleInstrument(one, 'KEYS');
    expect(two).toEqual([
      { instrument: 'BASS', isPrimary: true },
      { instrument: 'KEYS', isPrimary: false },
    ]);
    expect(toggleInstrument(two, 'KEYS')).toEqual([{ instrument: 'BASS', isPrimary: true }]);
  });

  it('al quitar el principal lo hereda el siguiente; makePrimary deja uno solo', () => {
    const list = [
      { instrument: 'BASS' as const, isPrimary: true },
      { instrument: 'KEYS' as const, isPrimary: false },
      { instrument: 'DRUMS' as const, isPrimary: false },
    ];
    expect(removeInstrument(list, 'BASS')).toEqual([
      { instrument: 'KEYS', isPrimary: true },
      { instrument: 'DRUMS', isPrimary: false },
    ]);
    expect(makePrimary(list, 'DRUMS').filter((item) => item.isPrimary)).toEqual([{ instrument: 'DRUMS', isPrimary: true }]);
  });
});
