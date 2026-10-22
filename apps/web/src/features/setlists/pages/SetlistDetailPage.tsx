import { useEffect, useMemo, useState } from 'react';
import { getCurrentOrganizationId } from '../../../shared/api/http';
import { takeUrlFlag } from '../../../shared/utils';
import { SetlistEditor } from '../editor';
import { SetlistDraft, SetlistFormDialog, SetlistHeader } from '../components';
import { StageMode } from '../stage-mode/components/StageMode';
import { SetlistPdfButton } from '../../print/SetlistPdfButton';
import {
  useArchiveSetlist,
  useCreateSetlist,
  useDeleteSetlist,
  usePublishSetlist,
  useSaveSetlistAsTemplate,
  useSetlist,
  useUpdateSetlist,
} from '../hooks';
import { buildCreateSetlistInput, canManageSetlistsClientSide, getCurrentUser } from '../utils';

type Navigate = (href: string) => void;

export function SetlistDetailPage({ id, navigate }: { id: string; navigate: Navigate }) {
  const organizationId = getCurrentOrganizationId() || '';
  const currentUser = useMemo(() => getCurrentUser(), []);
  const canManage = canManageSetlistsClientSide(currentUser.role);
  const canDelete = currentUser.role === 'OWNER' || currentUser.role === 'ADMIN';

  const [showEdit, setShowEdit] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showUseTemplate, setShowUseTemplate] = useState(false);
  const [formError, setFormError] = useState('');
  const [stageModeOpen, setStageModeOpen] = useState(false);

  useEffect(() => {
    if (takeUrlFlag('stage')) setStageModeOpen(true);
  }, []);

  const setlistQuery = useSetlist(organizationId, id);
  const updateMutation = useUpdateSetlist(organizationId);
  const archiveMutation = useArchiveSetlist(organizationId);
  const publishMutation = usePublishSetlist(organizationId);
  const deleteMutation = useDeleteSetlist(organizationId);
  const saveTemplateMutation = useSaveSetlistAsTemplate(organizationId);
  const createMutation = useCreateSetlist(organizationId);

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

  async function handleSaveAsTemplate(draft: SetlistDraft) {
    setFormError('');
    if (!draft.name.trim()) {
      setFormError('El nombre es requerido.');
      return;
    }
    try {
      const template = await saveTemplateMutation.mutateAsync({ id, input: { name: draft.name.trim(), description: draft.description.trim() || null } });
      setShowSaveTemplate(false);
      navigate(`/setlists/${template.id}`);
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo guardar la plantilla');
    }
  }

  async function handleUseTemplate(draft: SetlistDraft) {
    setFormError('');
    const input = buildCreateSetlistInput({ ...draft, sourceTemplateId: id });
    if (!input) {
      setFormError('El nombre es requerido.');
      return;
    }
    try {
      const created = await createMutation.mutateAsync(input);
      setShowUseTemplate(false);
      navigate(`/setlists/${created.id}`);
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo crear el setlist desde la plantilla');
    }
  }

  function closeDialogs() {
    setFormError('');
    setShowEdit(false);
    setShowSaveTemplate(false);
    setShowUseTemplate(false);
  }

  async function handleArchive() {
    if (!window.confirm('¿Archivar este setlist?')) return;
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
    if (!window.confirm('¿Eliminar este setlist? Esta acción no se puede deshacer.')) return;
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
    return <section className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-4 text-sm text-[#F7A39A]">{message}</section>;
  }

  const setlist = setlistQuery.data;
  if (!setlist) return null;

  if (stageModeOpen) {
    return (
      <StageMode
        organizationId={organizationId}
        setlistId={id}
        setlistName={setlist.name}
        onExit={() => setStageModeOpen(false)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SetlistHeader
        setlist={setlist}
        canManage={canManage}
        canPublish={false /* Publicar vive en la barra del editor, que avisa de roles y cues pendientes. */}
        canArchive={canManage}
        canDelete={canDelete}
        publishing={publishMutation.isPending}
        archiving={archiveMutation.isPending}
        deleting={deleteMutation.isPending}
        savingTemplate={saveTemplateMutation.isPending}
        onBack={() => navigate('/setlists')}
        onEdit={() => setShowEdit(true)}
        onPublish={() => void handlePublish()}
        onArchive={() => void handleArchive()}
        onDelete={() => void handleDelete()}
        onEnterStageMode={() => setStageModeOpen(true)}
        onSaveAsTemplate={canManage ? () => setShowSaveTemplate(true) : undefined}
        onCreateFromTemplate={canManage ? () => setShowUseTemplate(true) : undefined}
        extraActions={<SetlistPdfButton setlist={setlist} />}
      />

      <SetlistEditor
        organizationId={organizationId}
        setlistId={id}
        name={setlist.name}
        status={setlist.status}
        canManage={canManage}
        canPublish={canManage && !setlist.isTemplate}
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
          onClose={closeDialogs}
        />
      )}

      {showSaveTemplate && (
        <SetlistFormDialog
          mode="save-template"
          initial={{ name: `Plantilla - ${setlist.name}`, description: setlist.description || '' }}
          submitting={saveTemplateMutation.isPending}
          error={formError}
          onSubmit={(draft) => void handleSaveAsTemplate(draft)}
          onClose={closeDialogs}
        />
      )}

      {showUseTemplate && (
        <SetlistFormDialog
          mode="create"
          initial={{ name: '', description: setlist.description || '', sourceTemplateId: id }}
          templateOptions={[{ id, name: setlist.name, description: setlist.description }]}
          lockTemplateSelection
          submitting={createMutation.isPending}
          error={formError}
          onSubmit={(draft) => void handleUseTemplate(draft)}
          onClose={closeDialogs}
        />
      )}
    </div>
  );
}
