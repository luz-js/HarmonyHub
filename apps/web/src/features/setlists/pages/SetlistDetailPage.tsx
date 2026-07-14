import { useMemo, useState } from 'react';
import { getCurrentOrganizationId } from '../../../shared/api/http';
import { SetlistEditor } from '../editor';
import { SetlistFormDialog, SetlistHeader } from '../components';
import { useArchiveSetlist, useDeleteSetlist, usePublishSetlist, useSetlist, useUpdateSetlist } from '../hooks';
import { canManageSetlistsClientSide, getCurrentUser } from '../utils';

type Navigate = (href: string) => void;

export function SetlistDetailPage({ id, navigate }: { id: string; navigate: Navigate }) {
  const organizationId = getCurrentOrganizationId() || '';
  const currentUser = useMemo(() => getCurrentUser(), []);
  const canManage = canManageSetlistsClientSide(currentUser.role);
  const canDelete = currentUser.role === 'OWNER' || currentUser.role === 'ADMIN';

  const [showEdit, setShowEdit] = useState(false);
  const [formError, setFormError] = useState('');

  const setlistQuery = useSetlist(organizationId, id);
  const updateMutation = useUpdateSetlist(organizationId);
  const archiveMutation = useArchiveSetlist(organizationId);
  const publishMutation = usePublishSetlist(organizationId);
  const deleteMutation = useDeleteSetlist(organizationId);

  async function handleUpdate(draft: { name: string; description: string }) {
    setFormError('');
    if (!draft.name.trim()) {
      setFormError('El nombre es requerido.');
      return;
    }
    try {
      await updateMutation.mutateAsync({ id, input: { name: draft.name.trim(), description: draft.description.trim() || null } });
      setShowEdit(false);
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo actualizar el setlist');
    }
  }

  async function handleArchive() {
    if (!window.confirm('Archivar este setlist?')) return;
    await archiveMutation.mutateAsync(id);
  }

  async function handlePublish() {
    try {
      await publishMutation.mutateAsync(id);
    } catch (err: any) {
      window.alert(err?.message || 'No se pudo publicar el setlist');
    }
  }

  async function handleDelete() {
    if (!window.confirm('Eliminar este setlist? Esta accion no se puede deshacer.')) return;
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/setlists');
    } catch (err: any) {
      window.alert(err?.message || 'No se pudo eliminar el setlist');
    }
  }

  if (setlistQuery.isLoading) return <section className="panel p-5 text-muted">Cargando setlist...</section>;
  if (setlistQuery.error) {
    const message = setlistQuery.error instanceof Error ? setlistQuery.error.message : 'No se pudo cargar el setlist';
    return <section className="rounded-md border border-[#ff5c77]/30 bg-red-500/10 p-4 text-sm text-red-200">{message}</section>;
  }

  const setlist = setlistQuery.data;
  if (!setlist) return null;

  return (
    <div className="space-y-5">
      <SetlistHeader
        setlist={setlist}
        canManage={canManage}
        canPublish={canManage}
        canArchive={canManage}
        canDelete={canDelete}
        publishing={publishMutation.isPending}
        archiving={archiveMutation.isPending}
        deleting={deleteMutation.isPending}
        onBack={() => navigate('/setlists')}
        onEdit={() => setShowEdit(true)}
        onPublish={() => void handlePublish()}
        onArchive={() => void handleArchive()}
        onDelete={() => void handleDelete()}
      />

      <SetlistEditor
        organizationId={organizationId}
        setlistId={id}
        name={setlist.name}
        status={setlist.status}
        canManage={canManage}
        canPublish={canManage}
        publishing={publishMutation.isPending}
        onPublish={() => void handlePublish()}
      />

      {showEdit && (
        <SetlistFormDialog
          mode="edit"
          initial={{ name: setlist.name, description: setlist.description || '' }}
          submitting={updateMutation.isPending}
          error={formError}
          onSubmit={(draft) => void handleUpdate(draft)}
          onClose={() => {
            setFormError('');
            setShowEdit(false);
          }}
        />
      )}
    </div>
  );
}
