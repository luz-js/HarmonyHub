import type { SetlistSummary } from '../../../shared/types';
import { SetlistCard } from './SetlistCard';
import { SetlistEmptyState } from './SetlistEmptyState';

export function SetlistList({
  setlists,
  loading,
  error,
  onOpen,
  emptyAction,
  emptyTitle,
  emptySubtitle,
}: {
  setlists: SetlistSummary[];
  loading: boolean;
  error: string;
  onOpen: (id: string) => void;
  emptyAction?: React.ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
}) {
  if (loading) return <section className="panel p-5 text-muted">Cargando setlists...</section>;
  if (error) return <section className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-4 text-sm text-[#F7A39A]">{error}</section>;
  if (setlists.length === 0) {
    return (
      <SetlistEmptyState
        title={emptyTitle || 'No tienes setlists todavía.'}
        subtitle={emptySubtitle || 'Crea uno para organizar el orden de canciones y bloques de tu próximo servicio.'}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
      {setlists.map((setlist) => (
        <SetlistCard key={setlist.id} setlist={setlist} onOpen={() => onOpen(setlist.id)} />
      ))}
    </div>
  );
}
