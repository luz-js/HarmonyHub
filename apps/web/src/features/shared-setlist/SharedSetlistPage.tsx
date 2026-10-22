import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, LoaderCircle, Minus, Music2, Plus, RotateCcw } from 'lucide-react';
import type { SharedSetlist, SharedSetlistItem } from '../../shared/types';
import { setlistItemTypeLabels } from '../setlists/utils/setlist.utils';
import { getSharedSetlist, SharedSetlistError } from './sharedSetlist.client';
import { sharedSongView } from './sharedSongView';

/** Mientras se ve la pagina compartida: que los buscadores no la indexen y que el enlace no se filtre como referencia. */
function usePrivatePageMeta() {
  useEffect(() => {
    const added = [
      ['robots', 'noindex, nofollow, noarchive'],
      ['referrer', 'no-referrer'],
    ].map(([name, content]) => {
      const meta = document.createElement('meta');
      meta.name = name;
      meta.content = content;
      document.head.appendChild(meta);
      return meta;
    });
    return () => added.forEach((meta) => meta.remove());
  }, []);
}

const formatEventDate = (value: string) =>
  new Date(value).toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function SharedSong({ item, showChords }: { item: SharedSetlistItem; showChords: boolean }) {
  const [shift, setShift] = useState(0);
  const view = useMemo(() => sharedSongView(item, shift), [item, shift]);

  return (
    <article className="panel space-y-4 rounded-[14px] p-4 sm:p-5" aria-label={item.title}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white">
            <span className="mr-2 text-muted">{item.order}.</span>
            {item.title}
          </h2>
          {item.artist && <p className="text-sm text-muted">{item.artist}</p>}
        </div>
        {view.keyLabel && (
          <div className="flex items-center gap-1.5">
            <button type="button" className="btn-ghost h-9 w-9 p-0" aria-label="Bajar medio tono" onClick={() => setShift((value) => value - 1)}>
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[4.5rem] text-center text-sm font-bold text-white" aria-label="Tonalidad">
              {view.keyLabel}
            </span>
            <button type="button" className="btn-ghost h-9 w-9 p-0" aria-label="Subir medio tono" onClick={() => setShift((value) => value + 1)}>
              <Plus className="h-4 w-4" />
            </button>
            {shift !== 0 && (
              <button type="button" className="btn-ghost h-9 w-9 p-0" aria-label="Volver a la tonalidad del setlist" onClick={() => setShift(0)}>
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </header>

      {view.content && view.content.sections.length > 0 ? (
        <div className="space-y-5">
          {view.content.sections.map((section) => (
            <section key={section.id} className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{section.name}</h3>
              {section.lines.map((line) => (
                <div key={line.id} className="font-mono text-[15px] leading-snug">
                  {showChords && line.chords.trim() && <pre className="whitespace-pre-wrap font-bold text-primary">{line.chords}</pre>}
                  {line.lyrics && <pre className="whitespace-pre-wrap text-white">{line.lyrics}</pre>}
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Esta canción no tiene letra cargada.</p>
      )}
    </article>
  );
}

function SharedItem({ item, showChords }: { item: SharedSetlistItem; showChords: boolean }) {
  if (item.type === 'SONG') return <SharedSong item={item} showChords={showChords} />;
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-dashed border-[#30333A] px-4 py-3">
      <span className="text-muted">{item.order}.</span>
      <span className="font-semibold text-white">{item.title}</span>
      <span className="badge">{setlistItemTypeLabels[item.type]}</span>
    </div>
  );
}

/** Pagina publica de un setlist compartido por enlace: solo lectura y sin cuenta. */
export function SharedSetlistPage({ token, load = getSharedSetlist }: { token: string; load?: (token: string) => Promise<SharedSetlist> }) {
  usePrivatePageMeta();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'ready'; setlist: SharedSetlist } | { status: 'error'; message: string }>({ status: 'loading' });
  const [showChords, setShowChords] = useState(true);

  useEffect(() => {
    let active = true;
    load(token).then(
      (setlist) => active && setState({ status: 'ready', setlist }),
      (error: unknown) => active && setState({ status: 'error', message: error instanceof SharedSetlistError ? error.message : 'No se pudo abrir el setlist. Revisa tu conexión e intenta de nuevo.' }),
    );
    return () => {
      active = false;
    };
  }, [load, token]);

  return (
    <div className="min-h-screen bg-[#0E0F11] px-4 py-8 text-white sm:px-6">
      <main className="mx-auto max-w-3xl space-y-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Music2 className="h-4 w-4" /> HarmonyHub · Setlist compartido (solo lectura)
        </p>

        {state.status === 'loading' && (
          <p className="flex items-center gap-2 text-muted">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Cargando setlist…
          </p>
        )}

        {state.status === 'error' && (
          <section className="panel rounded-[14px] p-6" role="alert">
            <h1 className="text-xl font-bold text-white">No se puede abrir este setlist</h1>
            <p className="mt-2 text-[#D8D5CE]">{state.message}</p>
            <p className="mt-2 text-sm text-muted">Si alguien te lo compartió, pídele un enlace nuevo.</p>
          </section>
        )}

        {state.status === 'ready' && (
          <>
            <header className="space-y-2">
              <h1 className="text-[30px] font-bold leading-tight sm:text-[36px]">{state.setlist.name}</h1>
              {state.setlist.eventStartsAt && (
                <p className="flex items-center gap-2 text-[15px] text-[#D8D5CE]">
                  <CalendarDays className="h-4 w-4 text-muted" /> {formatEventDate(state.setlist.eventStartsAt)}
                </p>
              )}
              <label className="inline-flex items-center gap-2 text-sm text-[#D8D5CE]">
                <input type="checkbox" checked={showChords} onChange={(event) => setShowChords(event.target.checked)} /> Mostrar acordes
              </label>
            </header>

            {state.setlist.items.length === 0 ? (
              <p className="text-muted">Este setlist todavía no tiene canciones.</p>
            ) : (
              <>
                <nav aria-label="Orden del setlist" className="panel rounded-[14px] p-4">
                  <ol className="space-y-1 text-[15px]">
                    {state.setlist.items.map((item) => (
                      <li key={item.order} className="flex items-baseline gap-2">
                        <span className="w-6 text-right text-muted">{item.order}.</span>
                        <span className="font-semibold">{item.title}</span>
                        {item.type === 'SONG' && item.key && <span className="text-sm text-muted">· {item.key}</span>}
                      </li>
                    ))}
                  </ol>
                </nav>
                <div className="space-y-4">
                  {state.setlist.items.map((item) => (
                    <SharedItem key={item.order} item={item} showChords={showChords} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
