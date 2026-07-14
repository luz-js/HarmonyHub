import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Link2, Plus } from 'lucide-react';
import { useCreateSongLink, useDeleteSongLink, useReorderSongLinks, useSetPrimarySongLink, useSongLinks, useUpdateSongLink } from '../../hooks';
import type { SongLink, SongLinkProvider, SongVersion } from '../../../../shared/types';
import { getCurrentOrganizationId } from '../../../../shared/api/http';
import { SongLinkDialog, SongLinkDraft } from './AddSongLinkDialog';
import { LinkCard } from './LinkCard';
import { groupLinksByVersion, normalizeLinkOrder } from './link.utils';

type LinkFilter = 'all' | SongLinkProvider | 'otros';

const KNOWN_FILTER_PROVIDERS = new Set<SongLinkProvider>(['YOUTUBE', 'SPOTIFY', 'APPLE_MUSIC', 'SOUNDCLOUD', 'VIMEO']);

const FILTER_OPTIONS: Array<[LinkFilter, string]> = [
  ['all', 'Todos'],
  ['YOUTUBE', 'YouTube'],
  ['SPOTIFY', 'Spotify'],
  ['APPLE_MUSIC', 'Apple Music'],
  ['SOUNDCLOUD', 'SoundCloud'],
  ['VIMEO', 'Vimeo'],
  ['otros', 'Otros'],
];

function filterLinks(links: SongLink[], filter: LinkFilter) {
  if (filter === 'all') return links;
  if (filter === 'otros') return links.filter((link) => !KNOWN_FILTER_PROVIDERS.has(link.provider));
  return links.filter((link) => link.provider === filter);
}

function emptyDraft(activeVersionId?: string | null): SongLinkDraft {
  return { url: '', title: '', versionId: activeVersionId || '', isPrimary: false };
}

export function SongLinksPanel({
  songId,
  versions,
  activeVersionId,
  canManage,
  onChanged,
}: {
  songId: string;
  versions: SongVersion[];
  activeVersionId: string | null;
  canManage: boolean;
  onChanged?: () => void;
}) {
  const organizationId = getCurrentOrganizationId() || '';
  const linksQuery = useSongLinks(organizationId, songId);
  const createMutation = useCreateSongLink(organizationId, songId);
  const updateMutation = useUpdateSongLink(organizationId, songId);
  const deleteMutation = useDeleteSongLink(organizationId, songId);
  const setPrimaryMutation = useSetPrimarySongLink(organizationId, songId);
  const reorderMutation = useReorderSongLinks(organizationId, songId);

  const [filter, setFilter] = useState<LinkFilter>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<SongLink | null>(null);
  const [formError, setFormError] = useState('');

  const links = useMemo(() => linksQuery.data || [], [linksQuery.data]);
  const filteredLinks = useMemo(() => filterLinks(links, filter), [links, filter]);
  const grouped = useMemo(() => groupLinksByVersion(filteredLinks, activeVersionId), [filteredLinks, activeVersionId]);
  const primaryLinks = useMemo(() => filteredLinks.filter((link) => link.isPrimary), [filteredLinks]);

  function notifyChange() {
    onChanged?.();
  }

  async function handleCreate(draft: SongLinkDraft) {
    setFormError('');
    if (!draft.url.trim()) {
      setFormError('La URL es requerida.');
      return;
    }
    if (!draft.title.trim()) {
      setFormError('El título es requerido.');
      return;
    }
    try {
      await createMutation.mutateAsync({ url: draft.url, title: draft.title, versionId: draft.versionId || null, isPrimary: draft.isPrimary });
      notifyChange();
      setShowAddDialog(false);
    } catch (error: any) {
      setFormError(error?.message || 'No se pudo guardar el enlace');
    }
  }

  async function handleUpdate(draft: SongLinkDraft) {
    if (!editingLink) return;
    setFormError('');
    if (!draft.url.trim() || !draft.title.trim()) {
      setFormError('URL y título son requeridos.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        linkId: editingLink.id,
        input: { url: draft.url, title: draft.title, versionId: draft.versionId || null, isPrimary: draft.isPrimary },
      });
      notifyChange();
      setEditingLink(null);
    } catch (error: any) {
      setFormError(error?.message || 'No se pudo actualizar el enlace');
    }
  }

  async function handleDelete(link: SongLink) {
    if (!window.confirm(`Eliminar la referencia "${link.title || link.url}"?`)) return;
    await deleteMutation.mutateAsync(link.id);
    notifyChange();
  }

  async function handleMove(link: SongLink, direction: -1 | 1) {
    const contextLinks = normalizeLinkOrder(links.filter((item) => item.versionId === link.versionId));
    const currentIndex = contextLinks.findIndex((item) => item.id === link.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= contextLinks.length) return;
    const reordered = [...contextLinks];
    const [item] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, item);
    await reorderMutation.mutateAsync({
      versionId: link.versionId,
      items: reordered.map((entry, index) => ({ id: entry.id, sortOrder: index })),
    });
    notifyChange();
  }

  function renderGroup(title: string, subtitle: string, groupLinks: SongLink[], badgeClass: string, allowReorder = true) {
    if (groupLinks.length === 0) return null;
    return (
      <section className="panel p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="text-xs text-muted">{subtitle}</p>
          </div>
          <span className={`badge ${badgeClass}`}>{groupLinks.length}</span>
        </div>
        <div className="space-y-3">
          {groupLinks.map((link, index) => {
            const card = (
              <LinkCard
                link={link}
                versions={versions}
                canManage={canManage}
                onEdit={() => {
                  setFormError('');
                  setEditingLink(link);
                }}
                onDelete={() => void handleDelete(link)}
                onSetPrimary={() => void setPrimaryMutation.mutateAsync(link.id).then(notifyChange)}
              />
            );

            if (!canManage || !allowReorder) return <div key={link.id}>{card}</div>;

            return (
              <div key={link.id} className="flex items-start gap-2">
                <div className="flex-1">{card}</div>
                <div className="flex flex-col gap-1 pt-4">
                  <button type="button" className="btn-ghost h-8 w-8 p-0" onClick={() => void handleMove(link, -1)} disabled={index === 0} aria-label="Mover arriba"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" className="btn-ghost h-8 w-8 p-0" onClick={() => void handleMove(link, 1)} disabled={index === groupLinks.length - 1} aria-label="Mover abajo"><ArrowDown className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  const loading = linksQuery.isLoading;
  const error = linksQuery.error instanceof Error ? linksQuery.error.message : '';

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#1b2c40] bg-[#07131d] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00D4C8]">Referencias musicales</p>
            <h2 className="mt-2 text-xl font-bold text-white">Videos, streaming y material externo</h2>
            <p className="mt-1 text-sm text-muted">Agrega videos oficiales, versiones en streaming, tutoriales o grabaciones de ensayo.</p>
          </div>
          {canManage && (
            <button className="btn-primary" onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4" /> Agregar referencia</button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTER_OPTIONS.map(([key, label]) => (
            <button key={key} className={filter === key ? 'btn-primary' : 'btn-ghost'} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {loading && <section className="panel p-5 text-muted">Cargando referencias...</section>}
      {error && <section className="rounded-md border border-[#ff5c77]/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</section>}

      {!loading && !error && filteredLinks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#1b2c40] bg-[#08131d] px-6 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#173347] bg-[#0b1b24] text-[#00E6A3]">
            <Link2 className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-white">Esta canción todavía no tiene referencias externas.</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">Agrega videos, canciones en streaming, tutoriales o referencias externas.</p>
          {canManage && (
            <div className="mt-5 flex justify-center">
              <button className="btn-primary" onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4" /> Agregar referencia</button>
            </div>
          )}
        </div>
      )}

      {!loading && !error && filteredLinks.length > 0 && (
        <div className="space-y-5">
          {renderGroup('Referencias principales', 'Marcadas como principal en su contexto.', primaryLinks, 'badge-primary', false)}
          {renderGroup('Referencias de esta versión', versions.find((version) => version.id === activeVersionId)?.name || 'Versión activa', grouped.versionLinks, 'badge-primary')}
          {renderGroup('Referencias generales', 'Disponibles para cualquier versión de esta canción.', grouped.generalLinks, 'badge')}
          {renderGroup('Otras versiones', 'Material asociado a otras variantes musicales.', grouped.otherVersionLinks, 'badge-blue')}
        </div>
      )}

      {showAddDialog && (
        <SongLinkDialog
          mode="create"
          versions={versions}
          initial={emptyDraft(activeVersionId)}
          submitting={createMutation.isPending}
          error={formError}
          onSubmit={(draft) => void handleCreate(draft)}
          onClose={() => {
            setFormError('');
            setShowAddDialog(false);
          }}
        />
      )}

      {editingLink && (
        <SongLinkDialog
          mode="edit"
          versions={versions}
          initial={{ url: editingLink.url, title: editingLink.title || '', versionId: editingLink.versionId || '', isPrimary: editingLink.isPrimary }}
          submitting={updateMutation.isPending}
          error={formError}
          onSubmit={(draft) => void handleUpdate(draft)}
          onClose={() => {
            setFormError('');
            setEditingLink(null);
          }}
        />
      )}
    </div>
  );
}
