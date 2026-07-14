import { useState } from 'react';
import { Eye, LoaderCircle, Plus, Send } from 'lucide-react';
import type { SetlistItem, SetlistStatus } from '../../../../shared/types';
import { SetlistStatusBadge } from '../../components/SetlistStatusBadge';
import { formatDuration } from '../../../../shared/utils/format';
import { calculateTotalDuration } from '../utils/calculateDurations';
import { SetlistPreviewDialog } from './SetlistPreviewDialog';

export function SetlistToolbar({
  name,
  status,
  items,
  canManage,
  canPublish,
  publishing,
  onPublish,
  onAdd,
}: {
  name: string;
  status: SetlistStatus;
  items: SetlistItem[];
  canManage: boolean;
  canPublish: boolean;
  publishing: boolean;
  onPublish: () => void;
  onAdd: () => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const songs = items.filter((item) => item.type === 'SONG' && !item.isHidden).length;
  const blocks = items.filter((item) => item.type !== 'SONG' && !item.isHidden).length;
  const totalSec = calculateTotalDuration(items);
  const canPublishNow = canPublish && status !== 'PUBLISHED' && status !== 'ARCHIVED';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1b2c40] bg-[#0a1420] px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-bold text-white">{name}</h2>
        <SetlistStatusBadge status={status} />
        <span className="badge">{formatDuration(totalSec)}</span>
        <span className="badge">{songs} canciones</span>
        <span className="badge">{blocks} bloques</span>
      </div>

      <div className="flex items-center gap-2">
        {canManage && (
          <button type="button" className="btn-ghost" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Agregar
          </button>
        )}

        <button type="button" className="btn-ghost" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-4 w-4" /> Preview
        </button>

        {canPublishNow && (
          <button type="button" className="btn-primary" onClick={onPublish} disabled={publishing}>
            {publishing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publicar
          </button>
        )}
      </div>

      {previewOpen && <SetlistPreviewDialog name={name} items={items} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}
