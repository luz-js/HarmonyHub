import { Eye, EyeOff } from 'lucide-react';

export function EditorViewOptions({
  showChords,
  onShowChordsChange,
  fontSize,
  onFontSizeChange,
}: {
  showChords: boolean;
  onShowChordsChange: (value: boolean) => void;
  fontSize: number;
  onFontSizeChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn-ghost" onClick={() => onShowChordsChange(!showChords)}>
        {showChords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        Acordes
      </button>
      <button type="button" className="btn-ghost" aria-label="Reducir letra" onClick={() => onFontSizeChange(Math.max(13, fontSize - 1))}>A-</button>
      <button type="button" className="btn-ghost" aria-label="Aumentar letra" onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}>A+</button>
    </div>
  );
}
