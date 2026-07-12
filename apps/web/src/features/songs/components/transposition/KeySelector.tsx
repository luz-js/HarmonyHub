import type { AccidentalPreference } from '../../domain/transposition';

const keyGroups = [
  { sharp: 'C', flat: 'C' },
  { sharp: 'C#', flat: 'Db' },
  { sharp: 'D', flat: 'D' },
  { sharp: 'D#', flat: 'Eb' },
  { sharp: 'E', flat: 'E' },
  { sharp: 'F', flat: 'F' },
  { sharp: 'F#', flat: 'Gb' },
  { sharp: 'G', flat: 'G' },
  { sharp: 'G#', flat: 'Ab' },
  { sharp: 'A', flat: 'A' },
  { sharp: 'A#', flat: 'Bb' },
  { sharp: 'B', flat: 'B' },
];

export function KeySelector({ value, preference, onChange }: { value: string; preference: AccidentalPreference; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="label">Tonalidad destino</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        {keyGroups.map((key) => {
          const value = preference === 'FLATS' ? key.flat : key.sharp;
          const label = preference === 'AUTO' && key.sharp !== key.flat ? `${key.sharp} / ${key.flat}` : value;
          return <option key={`${key.sharp}-${key.flat}`} value={value}>{label}</option>;
        })}
      </select>
    </label>
  );
}
