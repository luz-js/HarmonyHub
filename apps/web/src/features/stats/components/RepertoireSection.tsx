import type { ReactNode } from 'react';
import type { RepertoireSongStat, RepertoireStats } from '../../../shared/types';
import { plural } from '../../../shared/utils';
import { formatStatsDate, sinceLabel } from '../statsFormat';
import { BarList } from './BarList';

type Navigate = (href: string) => void;

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="panel space-y-4 p-5 sm:p-6" aria-label={title}>
      <div>
        <h2 className="section-title">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-4">
      <p className="text-[28px] font-bold leading-none text-white">{value}</p>
      <p className="mt-1.5 text-sm text-muted">{label}</p>
    </div>
  );
}

function SongList({ songs, navigate, empty, detail }: { songs: Array<Pick<RepertoireSongStat, 'songId' | 'title' | 'artist'> & { lastPlayedAt?: string | null }>; navigate: Navigate; empty: string; detail?: (song: { lastPlayedAt?: string | null }) => string }) {
  if (songs.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-[#23252A]">
      {songs.map((song) => (
        <li key={song.songId}>
          <button type="button" className="flex w-full items-baseline justify-between gap-3 py-2 text-left text-sm transition hover:text-primary" onClick={() => navigate(`/songs/${song.songId}`)}>
            <span className="min-w-0 truncate">
              <span className="font-semibold text-white">{song.title}</span>
              {song.artist && <span className="ml-1.5 text-muted">{song.artist}</span>}
            </span>
            {detail && <span className="shrink-0 text-[13px] text-[#D8D5CE]">{detail(song)}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

const times = (value: number) => plural(value, 'vez', 'veces');

export function RepertoireSection({ stats, navigate }: { stats: RepertoireStats; navigate: Navigate }) {
  const { totals, rules } = stats;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Total label="Eventos con canciones en el periodo" value={totals.eventsPlayed} />
        <Total label="Canciones distintas tocadas" value={totals.songsPlayed} />
        <Total label="Canciones activas en el repertorio" value={totals.activeSongs} />
      </div>
      <p className="text-[13px] text-muted">
        Cuenta como tocada una canción visible del setlist de un evento confirmado o terminado cuya fecha ya pasó (una vez por evento).
        Los borradores, pendientes y cancelados no cuentan, ni las plantillas.
      </p>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="Más tocadas" description="En el periodo elegido.">
          <BarList
            items={stats.topSongs.map((song) => ({ id: song.songId, label: song.title, detail: song.artist, value: song.timesPlayed, onClick: () => navigate(`/songs/${song.songId}`) }))}
            valueLabel={times}
            emptyText="No se tocó ninguna canción en este periodo."
          />
        </Panel>
        <Panel title="Tonalidades" description="En qué tonalidad se tocaron las canciones del periodo.">
          <BarList items={stats.keys.map((row) => ({ id: row.key, label: row.key, value: row.timesPlayed }))} valueLabel={times} emptyText="Todavía no hay datos de tonalidades." />
        </Panel>
        <Panel title="Olvidadas" description={`Se tocaron alguna vez, pero no en los últimos ${rules.forgottenMonths} meses.`}>
          <SongList songs={stats.forgotten} navigate={navigate} empty="Ninguna: todo lo que se tocó volvió a sonar hace poco." detail={(song) => sinceLabel(song.lastPlayedAt)} />
        </Panel>
        <Panel title="Nunca tocadas" description="Canciones activas que no estuvieron en ningún evento.">
          <SongList songs={stats.neverPlayed} navigate={navigate} empty="Todas las canciones activas se tocaron al menos una vez." />
        </Panel>
      </div>

      <Panel title="Última vez que se tocó" description="Cada canción que se tocó alguna vez, la más reciente primero.">
        <SongList songs={stats.lastPlayed} navigate={navigate} empty="Todavía no hay eventos hechos con setlist." detail={(song) => formatStatsDate(song.lastPlayedAt)} />
      </Panel>
    </div>
  );
}
