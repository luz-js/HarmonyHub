import { Pause, Play } from 'lucide-react';
import type { SetlistItem } from '../../../../shared/types';
import { useSongTracks } from '../../../songs/hooks/useSongTracks';
import { useAudioPlayer } from '../../../songs/player';

export function CurrentTracks({ organizationId, item }: { organizationId: string; item: SetlistItem }) {
  const tracksQuery = useSongTracks(organizationId, item.songId ?? '', { versionId: item.songVersionId });
  const { currentTrack, isPlaying, playTrack, pause } = useAudioPlayer();

  const tracks = tracksQuery.data ?? [];
  const primaryTrack = tracks.find((track) => track.isPrimary) ?? tracks[0];

  if (!primaryTrack) return null;

  const isCurrent = currentTrack?.id === primaryTrack.id;
  const playing = isCurrent && isPlaying;

  return (
    <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg border border-[#30333A] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{primaryTrack.name}</p>
        <p className="text-xs text-muted">Pista actual</p>
      </div>
      <button
        type="button"
        className="btn-ghost h-9 w-9 shrink-0 p-0"
        aria-label={playing ? 'Detener pista' : 'Reproducir pista'}
        onClick={() => (playing ? pause() : void playTrack(primaryTrack, { songTitle: item.title }))}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
    </div>
  );
}
