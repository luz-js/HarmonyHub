import type { SetlistSummary } from '../../../shared/types';
import { SetlistCard } from './SetlistCard';
import { SetlistEmptyState } from './SetlistEmptyState';

export function SetlistList({
  setlists,
  loading,
  error,
  onOpen,
  emptyAction,
}: {
  setlists: SetlistSummary[];
  loading: boolean;
  error: string;
  onOpen: (id: string) => void;
  emptyAction?: React.ReactNode;
}) {
  if (loading) return <section className="panel p-5 text-muted">Cargando setlists...</section>;
  if (error) return <section className="rounded-md border border-[#ff5c77]/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</section>;
  if (setlists.length === 0) {
    return <SetlistEmptyState title="No tienes setlists todavía." subtitle="Crea uno para organizar el orden de canciones y bloques de tu próximo servicio." action={emptyAction} />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {setlists.map((setlist) => (
        <SetlistCard key={setlist.id} setlist={setlist} onOpen={() => onOpen(setlist.id)} />
      ))}
    </div>
  );
}
