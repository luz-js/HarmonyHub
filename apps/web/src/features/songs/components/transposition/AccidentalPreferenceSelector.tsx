import type { AccidentalPreference } from '../../domain/transposition';

export function AccidentalPreferenceSelector({ value, onChange }: { value: AccidentalPreference; onChange: (value: AccidentalPreference) => void }) {
  return (
    <label className="block">
      <span className="label">Preferencia</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value as AccidentalPreference)}>
        <option value="AUTO">Automatica</option>
        <option value="SHARPS">Sostenidos</option>
        <option value="FLATS">Bemoles</option>
      </select>
    </label>
  );
}
