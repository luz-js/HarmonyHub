import { Music2 } from 'lucide-react';
import type { SetlistItem, SongVersion } from '../../../../shared/types';
import { formatBpm, formatDuration, formatKey } from '../../../../shared/utils/format';

function OverrideValue({ label, original, effective }: { label: string; original: string; effective: string }) {
  const overridden = original !== '-' && effective !== original;
  return (
    <span className="badge">
      {label}: {overridden ? (
        <>
          <span className="text-faint line-through">{original}</span> → {effective}
        </>
      ) : (
        effective
      )}
    </span>
  );
}

/** Cabecera del workspace: portada/titulo/artista + comparacion Original -> Override, con el valor de la version en vivo (nunca snapshoteado). */
export function SongWorkspaceHeader({ item, liveVersion }: { item: SetlistItem; liveVersion: SongVersion | undefined }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[#1b2c40] px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#1b2c40] bg-[#0a1420]">
        {item.song?.coverUrl ? (
          <img src={item.song.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Music2 className="h-4 w-4 text-[var(--primary)]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{item.title}</p>
        <p className="truncate text-xs text-muted">
          {item.song?.artist} {item.songVersion?.name ? `· ${item.songVersion.name}` : ''}
        </p>
      </div>
      {liveVersion && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <OverrideValue label="Key" original={formatKey(liveVersion.key)} effective={formatKey(item.effective.key)} />
          <OverrideValue label="BPM" original={formatBpm(liveVersion.bpm)} effective={formatBpm(item.effective.bpm)} />
          <OverrideValue label="Duración" original={formatDuration(liveVersion.durationSec)} effective={formatDuration(item.effective.durationSec)} />
          {item.capo != null && <span className="badge">Capo {item.capo}</span>}
        </div>
      )}
    </div>
  );
}
