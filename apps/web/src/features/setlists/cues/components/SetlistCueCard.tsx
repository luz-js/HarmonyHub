import { useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Copy, Trash2, User } from 'lucide-react';
import type { CueWarning, SetlistCue, SetlistCuePriority } from '../../../../shared/types';
import { formatDuration } from '../../../../shared/utils/format';
import { getCueTypeLabel, getCueTypeIcon, PRIORITY_LABELS } from '../utils/cueLabels';
import { formatCueClock } from '../utils/cueTimeline';
import { CuePriorityBadge } from './CuePriorityBadge';
import { CueResponsiblePicker } from './CueResponsiblePicker';
import { CueStatusSelect } from './CueStatusSelect';

const PRIORITY_OPTIONS: SetlistCuePriority[] = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

export function SetlistCueCard({
  organizationId,
  setlistId,
  cue,
  canManage,
  canEditOwnStatus,
  warnings,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onChangeTitle,
  onChangeOffset,
  onChangePriority,
  onChangeResponsible,
  onChangeStatus,
  onDuplicate,
  onDelete,
}: {
  organizationId: string;
  setlistId: string;
  cue: SetlistCue;
  canManage: boolean;
  canEditOwnStatus: boolean;
  warnings: CueWarning[];
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChangeTitle: (title: string) => void;
  onChangeOffset: (offsetSec: number | null) => void;
  onChangePriority: (priority: SetlistCuePriority) => void;
  onChangeResponsible: (participantId: string | null) => void;
  onChangeStatus: (status: SetlistCue['status']) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(cue.title);
  const [offset, setOffset] = useState(cue.offsetSec != null ? String(cue.offsetSec) : '');
  const [responsibleOpen, setResponsibleOpen] = useState(false);
  const Icon = getCueTypeIcon(cue.type);

  return (
    <div className="rounded-lg border border-[#1b2c40] bg-[#0a1420] p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-[var(--primary)]" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{getCueTypeLabel(cue.type)}</p>
            {canManage ? (
              <input
                className="input h-7 px-1 text-sm"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => title.trim() && onChangeTitle(title)}
              />
            ) : (
              <p className="truncate text-sm font-semibold text-white">{cue.title}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {canManage && (
            <>
              <button type="button" className="btn-ghost h-7 w-7 p-0" aria-label="Mover arriba" disabled={isFirst} onClick={onMoveUp}>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="btn-ghost h-7 w-7 p-0" aria-label="Mover abajo" disabled={isLast} onClick={onMoveDown}>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="btn-ghost h-7 w-7 p-0" aria-label="Duplicar cue" onClick={onDuplicate}>
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="btn-ghost h-7 w-7 p-0 text-red-300" aria-label="Eliminar cue" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="block">
          <span className="label">Offset (s)</span>
          <input
            className="input h-8 text-xs"
            type="number"
            value={offset}
            disabled={!canManage}
            onChange={(event) => setOffset(event.target.value)}
            onBlur={() => onChangeOffset(offset === '' ? null : Number(offset))}
          />
        </label>

        <div>
          <span className="label">Prioridad</span>
          {canManage ? (
            <select className="select h-8 text-xs" value={cue.priority} onChange={(event) => onChangePriority(event.target.value as SetlistCuePriority)}>
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-1">
              <CuePriorityBadge priority={cue.priority} />
            </div>
          )}
        </div>

        <div>
          <span className="label">Estado</span>
          <CueStatusSelect value={cue.status} onChange={onChangeStatus} disabled={!canEditOwnStatus} />
        </div>

        <div className="relative">
          <span className="label">Responsable</span>
          <button
            type="button"
            className="btn-ghost mt-0.5 flex h-8 w-full items-center gap-1 px-2 text-xs"
            disabled={!canManage}
            onClick={() => setResponsibleOpen((value) => !value)}
          >
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{cue.responsibleParticipant?.membership.user.name || 'Sin asignar'}</span>
          </button>
          {responsibleOpen && (
            <>
              <button type="button" aria-label="Cerrar" className="fixed inset-0 z-10 cursor-default" onClick={() => setResponsibleOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-[#1b2c40] bg-[#0d1c2b] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <CueResponsiblePicker
                  organizationId={organizationId}
                  setlistId={setlistId}
                  value={cue.responsibleParticipant?.id ?? null}
                  onChange={(participantId) => {
                    onChangeResponsible(participantId);
                    setResponsibleOpen(false);
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {cue.durationSec != null && <p className="mt-1 text-[11px] text-muted">Duracion: {formatDuration(cue.durationSec)}</p>}
      {cue.timelinePositionSec != null && <p className="text-[11px] text-faint">Timeline: {formatCueClock(cue.timelinePositionSec)}</p>}

      {warnings.length > 0 && (
        <div className="mt-2 space-y-1">
          {warnings.map((warning) => (
            <p key={warning.code} className="flex items-center gap-1 text-[11px] text-[#ffd37b]">
              <AlertTriangle className="h-3 w-3 shrink-0" /> {warning.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
