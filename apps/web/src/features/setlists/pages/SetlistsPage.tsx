import { useEffect, useMemo, useState } from 'react';
import { LayoutTemplate, ListMusic, Plus, Search } from 'lucide-react';
import { getCurrentOrganizationId } from '../../../shared/api/http';
import type { SetlistStatus } from '../../../shared/types';
import { takeUrlFlag } from '../../../shared/utils';
import { SetlistDraft, SetlistFormDialog, SetlistList } from '../components';
import { useCreateSetlist, useSetlists } from '../hooks';
import { buildCreateSetlistInput, canManageSetlistsClientSide, getCurrentUser, toTemplateOptions } from '../utils';

type Navigate = (href: string) => void;
type SetlistsTab = 'setlists' | 'templates';

export function SetlistsPage({ navigate }: { navigate: Navigate }) {
  const organizationId = getCurrentOrganizationId() || '';
  const currentUser = useMemo(() => getCurrentUser(), []);
  const canManage = canManageSetlistsClientSide(currentUser.role);

  const [tab, setTab] = useState<SetlistsTab>('setlists');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SetlistStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (takeUrlFlag('nuevo') && canManage) setShowCreate(true);
  }, [canManage]);

  const showingTemplates = tab === 'templates';
  const setlistsQuery = useSetlists(organizationId, {
    search: search.trim() || undefined,
    status: showingTemplates ? undefined : status || undefined,
    isTemplate: showingTemplates,
  });
  const templatesQuery = useSetlists(organizationId, { isTemplate: true, pageSize: 100 });
  const templateOptions = toTemplateOptions(templatesQuery.data?.items || []);
  const createMutation = useCreateSetlist(organizationId);

  async function handleCreate(draft: SetlistDraft) {
    setFormError('');
    const input = buildCreateSetlistInput(draft);
    if (!input) {
      setFormError('El nombre es requerido.');
      return;
    }
    try {
      const created = await createMutation.mutateAsync(input);
      setShowCreate(false);
      navigate(`/setlists/${created.id}`);
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo crear el setlist');
    }
  }

  const createButton = canManage ? (
    <button className="btn-primary self-start md:self-auto" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Nuevo setlist</button>
  ) : undefined;

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Setlists</h1>
          <p className="page-subtitle">Organiza el orden de canciones y bloques para tus servicios.</p>
        </div>
        {createButton}
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2" role="tablist" aria-label="Tipo de setlist">
          <button
            role="tab"
            aria-selected={!showingTemplates}
            type="button"
            className="tab-pill"
            onClick={() => setTab('setlists')}
          >
            <ListMusic className="h-4 w-4" /> Setlists
          </button>
          <button
            role="tab"
            aria-selected={showingTemplates}
            type="button"
            className="tab-pill"
            onClick={() => setTab('templates')}
          >
            <LayoutTemplate className="h-4 w-4" /> Plantillas
            {templateOptions.length > 0 && <span className="opacity-70">{templateOptions.length}</span>}
          </button>
        </div>
        <label className="relative min-w-0 flex-1 basis-full sm:basis-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            className="input pl-9"
            placeholder={showingTemplates ? 'Buscar plantilla...' : 'Buscar setlist...'}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {!showingTemplates && (
          <select className="select w-full sm:w-auto" aria-label="Estado" value={status} onChange={(event) => setStatus(event.target.value as SetlistStatus | '')}>
            <option value="">Todos los estados</option>
            <option value="DRAFT">Borrador</option>
            <option value="READY">Listo</option>
            <option value="PUBLISHED">Publicado</option>
            <option value="ARCHIVED">Archivado</option>
          </select>
        )}
      </section>

      <SetlistList
        setlists={setlistsQuery.data?.items || []}
        loading={setlistsQuery.isLoading}
        error={setlistsQuery.error instanceof Error ? setlistsQuery.error.message : ''}
        onOpen={(id) => navigate(`/setlists/${id}`)}
        emptyTitle={showingTemplates ? 'No hay plantillas todavía.' : undefined}
        emptySubtitle={
          showingTemplates
            ? 'Abre un setlist y usa "Guardar como plantilla" para reutilizar su estructura en próximos servicios.'
            : undefined
        }
        emptyAction={showingTemplates ? undefined : createButton}
      />

      {showCreate && (
        <SetlistFormDialog
          mode="create"
          initial={{ name: '', description: '', sourceTemplateId: null }}
          templateOptions={templateOptions}
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
