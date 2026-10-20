import { Copy, Plus, Trash2, ArrowDown, ArrowUp } from 'lucide-react';
import type { SongLine } from '../../types/song-content.types';

export function SongLineEditor({
  line,
  showChords,
  readOnly,
  onChange,
  onDelete,
  onInsertAfter,
  onDuplicate,
  onMove,
}: {
  line: SongLine;
  showChords: boolean;
  readOnly?: boolean;
  onChange: (patch: Partial<SongLine>) => void;
  onDelete: () => void;
  onInsertAfter: () => void;
  onDuplicate: () => void;
  onMove: (direction: 'UP' | 'DOWN') => void;
}) {
  function handleLyricsKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onInsertAfter();
    }
  }

  return (
    <div className="group grid gap-1 rounded-md border border-transparent px-2 py-2 focus-within:border-primary/40 hover:border-white/10 md:grid-cols-[1fr_auto]">
      <div className="space-y-1">
        {showChords && (
          <label className="block">
            <span className="sr-only">Acordes</span>
            <input
              className="w-full border-0 bg-transparent p-0 font-mono text-sm leading-6 text-primary outline-none placeholder:text-slate-600"
              value={line.chords}
              onChange={(event) => onChange({ chords: event.target.value })}
              placeholder="D        A        Bm       G"
              readOnly={readOnly}
              spellCheck={false}
            />
          </label>
        )}
        <label className="block">
          <span className="sr-only">Letra</span>
          <input
            className="w-full border-0 bg-transparent p-0 text-base leading-7 text-white outline-none placeholder:text-slate-600"
            value={line.lyrics}
            onChange={(event) => onChange({ lyrics: event.target.value })}
            onKeyDown={handleLyricsKeyDown}
            placeholder="Letra de la línea"
            readOnly={readOnly}
            spellCheck={false}
          />
        </label>
      </div>
      {!readOnly && (
        <div className="flex items-center gap-1 opacity-80 md:opacity-0 md:group-hover:opacity-100">
          <button type="button" className="icon-button" aria-label="Mover línea arriba" onClick={() => onMove('UP')}><ArrowUp className="h-3.5 w-3.5" /></button>
          <button type="button" className="icon-button" aria-label="Mover línea abajo" onClick={() => onMove('DOWN')}><ArrowDown className="h-3.5 w-3.5" /></button>
          <button type="button" className="icon-button" aria-label="Duplicar línea" onClick={onDuplicate}><Copy className="h-3.5 w-3.5" /></button>
          <button type="button" className="icon-button" aria-label="Insertar línea debajo" onClick={onInsertAfter}><Plus className="h-3.5 w-3.5" /></button>
          <button type="button" className="icon-button text-[#F7A39A]" aria-label="Borrar línea" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </div>
  );
}
