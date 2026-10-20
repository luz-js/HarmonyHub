import { ArrowLeftRight, Coffee, Copy, Eye, EyeOff, Heart, Megaphone, Mic, Music2, Pencil, Sparkles, Trash2, Video, VolumeX, type LucideIcon } from 'lucide-react';
import type { SetlistItem } from '../../../shared/types';
import { canMoveItemDown, canMoveItemUp, resolveSetlistItemDisplayMetadata } from '../utils';

const TYPE_ICONS: Record<SetlistItem['type'], LucideIcon> = {
  SONG: Music2,
  SPEAKING: Mic,
  PRAYER: Heart,
  VIDEO: Video,
  ANNOUNCEMENT: Megaphone,
  SILENCE: VolumeX,
  TRANSITION: ArrowLeftRight,
  BREAK: Coffee,
  CUSTOM: Sparkles,
};

export function SetlistItemRow({
  item,
  index,
  total,
  canManage,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleHidden,
}: {
  item: SetlistItem;
  index: number;
  total: number;
  canManage: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleHidden: () => void;
}) {
  const Icon = TYPE_ICONS[item.type];
  const meta = resolveSetlistItemDisplayMetadata(item);

  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-xl border border-[#30333A] bg-[#1A1B1F] px-4 py-3 ${item.isHidden ? 'opacity-50' : ''}`}>
      <span className="icon-tile h-9 w-9 shrink-0"><Icon className="h-4 w-4" /></span>

      <div className="min-w-[180px] flex-1">
        <p className="text-sm font-bold text-white">{item.title}</p>
        <p className="text-xs text-muted">{meta.subtitle || meta.typeLabel}</p>
        {item.transitionNote && <p className="mt-1 text-[11px] text-faint">Transición: {item.transitionNote}</p>}
      </div>

      {item.type === 'SONG' && (
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
          <span className="badge">{meta.keyLabel}</span>
          <span>{meta.bpmLabel}</span>
          <span>{meta.durationLabel}</span>
          {item.capo != null && <span>Capo {item.capo}</span>}
        </div>
      )}
      {item.type !== 'SONG' && meta.durationLabel !== '—' && <span className="shrink-0 text-xs text-muted">{meta.durationLabel}</span>}

      {canManage && (
        <div className="flex shrink-0 items-center gap-1">
          <button className="btn-ghost h-8 w-8 p-0" disabled={!canMoveItemUp(index)} onClick={onMoveUp} aria-label="Mover arriba">▲</button>
          <button className="btn-ghost h-8 w-8 p-0" disabled={!canMoveItemDown(index, total)} onClick={onMoveDown} aria-label="Mover abajo">▼</button>
          <button className="btn-ghost h-8 w-8 p-0" onClick={onToggleHidden} aria-label={item.isHidden ? 'Mostrar' : 'Ocultar'}>
            {item.isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button className="btn-ghost h-8 w-8 p-0" onClick={onEdit} aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></button>
          <button className="btn-ghost h-8 w-8 p-0" onClick={onDuplicate} aria-label="Duplicar"><Copy className="h-3.5 w-3.5" /></button>
          <button className="btn-ghost h-8 w-8 p-0 text-[#F7A39A]" onClick={onDelete} aria-label="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </div>
  );
}
