import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LoaderCircle, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { getRolePermissions, resetRolePermissions, updateRolePermissions } from '../../../shared/api/api-client';
import { queryClient } from '../../../shared/api/query-client';
import type { RolePermissionsMatrix } from '../../../shared/types';

const ROLE_LABELS: Record<string, string> = { ADMIN: 'Admin', LEADER: 'Líder', MUSICIAN: 'Músico', GUEST: 'Invitado' };

const PERMISSION_LABELS: Record<string, string> = {
  'organization.manage': 'Editar los datos de la organización',
  'members.manage': 'Gestionar miembros y roles de otros',
  'invitations.manage': 'Invitar personas',
  'songs.manage': 'Crear y editar canciones',
  'events.manage': 'Crear y editar eventos y equipos',
  'events.delete': 'Eliminar eventos',
  'setlists.manage': 'Crear y editar setlists',
  'setlists.publish': 'Publicar setlists',
  'setlists.archive': 'Archivar setlists',
  'setlists.delete': 'Eliminar setlists',
  'setlists.participants.manage': 'Gestionar participantes de setlists',
  'setlists.assignments.manage': 'Asignar roles musicales',
  'setlists.requirements.manage': 'Definir roles requeridos',
  'setlists.cues.manage': 'Gestionar cues',
  'availability.read': 'Ver disponibilidad del equipo',
  'stage.lead': 'Dirigir Stage Mode en vivo',
  'organization.transfer': 'Transferir la propiedad',
  'organization.archive': 'Archivar o restaurar la organización',
  'roles.manage': 'Cambiar roles y permisos',
  read: 'Ver el contenido',
  'organization.leave': 'Salir de la organización',
};

const label = (permission: string) => PERMISSION_LABELS[permission] ?? permission;
type Draft = Record<string, string[]>;

/** Ajustes → Roles y permisos (solo el propietario): activar o desactivar permisos de cada rol en esta organización. */
export function RolePermissionsSettings({ organizationId }: { organizationId: string }) {
  const queryKey = ['role-permissions', organizationId];
  const matrix = useQuery({ queryKey, queryFn: getRolePermissions, enabled: Boolean(organizationId) });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState('');
  const onSaved = (data: RolePermissionsMatrix) => {
    queryClient.setQueryData(queryKey, data);
    setDraft(data.effective);
  };
  const save = useMutation({ mutationFn: (roles: Draft) => updateRolePermissions({ roles }), onSuccess: (data) => (onSaved(data), setNotice('Permisos guardados.')) });
  const reset = useMutation({ mutationFn: resetRolePermissions, onSuccess: (data) => (onSaved(data), setNotice('Se restablecieron los valores por defecto.')) });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la matriz llega del servidor; el borrador arranca con ella
    if (matrix.data && !draft) setDraft(matrix.data.effective);
  }, [matrix.data, draft]);

  const data = matrix.data;
  const error = save.error ?? reset.error ?? matrix.error;

  function toggle(role: string, permission: string) {
    setNotice('');
    setDraft((current) => {
      if (!current) return current;
      const list = current[role] ?? [];
      return { ...current, [role]: list.includes(permission) ? list.filter((item) => item !== permission) : [...list, permission] };
    });
  }

  return (
    <section className="panel space-y-4 p-5 sm:p-6" aria-label="Roles y permisos">
      <div>
        <h2 className="section-title flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Roles y permisos
        </h2>
        <p className="mt-1 text-sm text-muted">
          Ajusta qué puede hacer cada rol en esta organización. El propietario siempre puede todo, y solo él transfiere, archiva y cambia estos permisos.
        </p>
      </div>

      {matrix.isLoading || !data || !draft ? (
        matrix.isError ? null : (
          <p className="flex items-center gap-2 text-sm text-muted">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Cargando…
          </p>
        )
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-2 pr-3 font-semibold">Permiso</th>
                  {data.roles.map((role) => (
                    <th key={role} className="px-2 py-2 text-center font-semibold">
                      {ROLE_LABELS[role] ?? role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23252A]">
                {data.configurable.map((permission) => (
                  <tr key={permission}>
                    <td className="py-2 pr-3 text-[#D8D5CE]">{label(permission)}</td>
                    {data.roles.map((role) => {
                      const checked = draft[role]?.includes(permission) ?? false;
                      const changed = checked !== data.defaults[role].includes(permission);
                      return (
                        <td key={role} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            className={`h-4 w-4 cursor-pointer accent-[var(--primary)] ${changed ? 'outline outline-2 outline-offset-2 outline-[#E8C27A]' : ''}`}
                            aria-label={`${ROLE_LABELS[role] ?? role}: ${label(permission)}`}
                            checked={checked}
                            onChange={() => toggle(role, permission)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">
            Fijos: todos pueden {data.alwaysGranted.map(label).map((text) => text.toLowerCase()).join(' y ')}; solo el propietario puede{' '}
            {data.ownerOnly.map(label).map((text) => text.toLowerCase()).join(', ')}. Las casillas con borde amarillo son distintas a los valores por defecto.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={save.isPending} onClick={() => save.mutate(draft)}>
              {save.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar permisos
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={reset.isPending}
              onClick={() => window.confirm('¿Volver a los permisos por defecto de cada rol?') && reset.mutate()}
            >
              <RotateCcw className="h-4 w-4" /> Restablecer valores por defecto
            </button>
          </div>
        </>
      )}
      {notice && <p className="text-sm text-[#7FD8C7]">{notice}</p>}
      {error && (
        <p role="alert" className="text-sm text-[#F7A39A]">
          {error instanceof Error ? error.message : 'No se pudieron cargar los permisos.'}
        </p>
      )}
    </section>
  );
}
