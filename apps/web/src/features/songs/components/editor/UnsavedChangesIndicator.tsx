export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export function UnsavedChangesIndicator({ state }: { state: SaveState }) {
  const text = {
    idle: 'Guardado',
    dirty: 'Cambios sin guardar',
    saving: 'Guardando...',
    saved: 'Guardado',
    error: 'Error al guardar',
  }[state];

  return <span className={state === 'error' ? 'text-sm font-semibold text-[#F7A39A]' : state === 'dirty' ? 'text-sm font-semibold text-warning-soft' : 'text-sm text-muted'}>{text}</span>;
}
