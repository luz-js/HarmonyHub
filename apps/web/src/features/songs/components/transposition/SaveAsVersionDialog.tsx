export function SaveAsVersionDialog({ name, onNameChange, targetKey }: { name: string; onNameChange: (value: string) => void; targetKey: string }) {
  return (
    <label className="block">
      <span className="label">Nombre de nueva versión</span>
      <input className="input" value={name} onChange={(event) => onNameChange(event.target.value)} placeholder={`En ${targetKey}`} />
    </label>
  );
}
