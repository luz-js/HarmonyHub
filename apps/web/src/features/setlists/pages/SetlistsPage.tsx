import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { getCurrentOrganizationId } from '../../../shared/api/http';
import type { SetlistStatus } from '../../../shared/types';
import { SetlistFormDialog, SetlistList } from '../components';
import { useCreateSetlist, useSetlists } from '../hooks';
import { canManageSetlistsClientSide, getCurrentUser } from '../utils';

type Navigate = (href: string) => void;

export function SetlistsPage({ navigate }: { navigate: Navigate }) {
  const organizationId = getCurrentOrganizationId() || '';
  const currentUser = useMemo(() => getCurrentUser(), []);
  const canManage = canManageSetlistsClientSide(currentUser.role);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SetlistStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState('');

  const setlistsQuery = useSetlists(organizationId, { search: search.trim() || undefined, status: status || undefined });
  const createMutation = useCreateSetlist(organizationId);

  async function handleCreate(draft: { name: string; description: string }) {
    setFormError('');
    if (!draft.name.trim()) {
      setFormError('El nombre es requerido.');
      return;
    }
    try {
      const created = await createMutation.mutateAsync({ name: draft.name.trim(), description: draft.description.trim() || undefined });
      setShowCreate(false);
      navigate(`/setlists/${created.id}`);
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo crear el setlist');
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Setlists</h1>
          <p className="mt-1 text-sm text-muted">Organiza el orden de canciones y bloques para tus servicios.</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Nuevo setlist</button>
        )}
      </section>

      <section className="flex flex-wrap gap-3">
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input className="input h-9 pl-9" placeholder="Buscar setlist..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select className="select h-9 w-auto" value={status} onChange={(event) => setStatus(event.target.value as SetlistStatus | '')}>
          <option value="">Todos los estados</option>
          <option value="DRAFT">Borrador</option>
          <option value="READY">Listo</option>
          <option value="PUBLISHED">Publicado</option>
          <option value="ARCHIVED">Archivado</option>
        </select>
      </section>

      <SetlistList
        setlists={setlistsQuery.data?.items || []}
        loading={setlistsQuery.isLoading}
        error={setlistsQuery.error instanceof Error ? setlistsQuery.error.message : ''}
        onOpen={(id) => navigate(`/setlists/${id}`)}
        emptyAction={canManage ? <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Crear setlist</button> : undefined}
      />

      {showCreate && (
        <SetlistFormDialog
          mode="create"
          initial={{ name: '', description: '' }}
          submitting={createMutation.isPending}
          error={formError}
          onSubmit={(draft) => void handleCreate(draft)}
          onClose={() => {
            setFormError('');
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
