import type { SetlistItem } from '../../../../shared/types';
import { formatDuration } from '../../../../shared/utils/format';
import { calculateMusicDuration, calculateSpeakingDuration } from '../utils/calculateDurations';

/** Estadisticas calculadas en cliente a partir de item.effective.* — nunca persistidas. */
export function SetlistStatistics({ items, selectedStartSec }: { items: SetlistItem[]; selectedStartSec: number | null }) {
  const musicSec = calculateMusicDuration(items);
  const speakingSec = calculateSpeakingDuration(items);
  const totalSec = musicSec + speakingSec;
  const remainingSec = selectedStartSec != null ? Math.max(0, totalSec - selectedStartSec) : totalSec;
  const songs = items.filter((item) => item.type === 'SONG' && !item.isHidden).length;
  const blocks = items.filter((item) => item.type !== 'SONG' && !item.isHidden).length;

  const stats = [
    { label: 'Duracion total', value: formatDuration(totalSec) },
    { label: 'Canciones', value: String(songs) },
    { label: 'Bloques', value: String(blocks) },
    { label: 'Tiempo musical', value: formatDuration(musicSec) },
    { label: 'Tiempo hablado', value: formatDuration(speakingSec) },
    { label: 'Tiempo restante', value: formatDuration(remainingSec) },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-[#1b2c40] bg-[#0a1420] px-3 py-2 text-center">
          <p className="text-base font-bold text-white">{stat.value}</p>
          <p className="text-[11px] text-muted">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
