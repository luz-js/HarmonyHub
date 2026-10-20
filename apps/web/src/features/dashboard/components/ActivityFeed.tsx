import type { DashboardActivityItem } from '../../../shared/types';
import { formatRelativeTime, getInitials } from '../utils';

function lowerFirst(text: string) {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

/** Actividad reciente del repertorio (SongActivity de toda la organizacion). */
export function ActivityFeed({
  items,
  loading,
  error,
  onOpenSong,
}: {
  items: DashboardActivityItem[];
  loading?: boolean;
  error?: string;
  onOpenSong: (songId: string) => void;
}) {
  if (loading) return <p className="text-sm text-muted">Cargando actividad...</p>;
  if (error) return <p className="text-sm text-[#F7A39A]">{error}</p>;
  if (items.length === 0) return <p className="text-sm text-muted">Todavía no hay actividad. Lo que el equipo haga en el repertorio aparecerá aquí.</p>;

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <button key={item.id} type="button" className="-mx-2 flex w-[calc(100%+16px)] gap-3 rounded-lg px-2 py-1 text-left transition hover:bg-white/5" onClick={() => onOpenSong(item.song.id)}>
          <span className="avatar h-[34px] w-[34px] shrink-0 text-xs">{getInitials(item.actor?.name)}</span>
          <span className="min-w-0">
            <span className="block text-[15px] leading-snug text-white">
              <span className="font-semibold">{item.actor?.name?.split(' ')[0] || 'Alguien'}</span>{' '}
              <span className="text-[#C9C5BD]">{lowerFirst(item.summary)}</span>
            </span>
            <span className="mt-0.5 block truncate text-[13px] text-faint">{item.song.title} · {formatRelativeTime(item.createdAt)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
