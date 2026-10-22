import { FormEvent, ReactNode, useState } from 'react';
import { Archive, ArchiveRestore, Crown, LogOut } from 'lucide-react';
import type { AppOrganization } from '../../../app/types';
import { OverlayDialog } from '../../../shared/components/OverlayDialog';
import { formatRole } from '../../../shared/utils/format';
import { useMemberships } from '../../musicians/hooks';
import { useArchiveOrganization, useLeaveOrganization, useRestoreOrganization, useTransferOrganization } from '../hooks';

type OrganizationSettingsProps = {
  organization: AppOrganization;
  currentUserId: string;
  /** Despues de salir, transferir, archivar o restaurar la app vuelve a sincronizar la sesion. */
  onChanged: () => void;
};

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

/** Ajustes > Organizacion: salir (cualquiera), transferir la propiedad y archivar o restaurar (solo propietarios). */
export function OrganizationSettings({ organization, currentUserId, onChanged }: OrganizationSettingsProps) {
  const isOwner = organization.role === 'OWNER';
  const archived = Boolean(organization.archivedAt);
  const [dialog, setDialog] = useState<'transfer' | 'archive' | null>(null);

  return (
    <section className="panel space-y-5 p-5" aria-labelledby="organization-settings-title">
      <div>
        <h2 id="organization-settings-title" className="section-title">
          Organización
        </h2>
        <p className="mt-1 text-sm text-muted">
          {organization.name} · Tu rol: {formatRole(organization.role)}
          {archived ? ' · Archivada' : ''}
        </p>
      </div>

      <div className="divide-y divide-[#23252A] rounded-xl border border-[#30333A]">
        {isOwner && archived && <RestoreRow organization={organization} onChanged={onChanged} />}
        {isOwner && !archived && (
          <SettingRow
            icon={<Crown className="h-4 w-4" />}
            title="Transferir la propiedad"
            description="Nombra a otra persona del equipo como propietaria. La organización nunca queda sin propietario."
            action={
              <button type="button" className="btn-ghost" onClick={() => setDialog('transfer')}>
                Transferir
              </button>
            }
          />
        )}
        {isOwner && !archived && (
          <SettingRow
            icon={<Archive className="h-4 w-4" />}
            title="Archivar la organización"
            description="Queda de solo lectura para todo el equipo. No se borra nada y la puedes restaurar cuando quieras."
            action={
              <button type="button" className="btn-ghost" onClick={() => setDialog('archive')}>
                Archivar
              </button>
            }
          />
        )}
        <LeaveRow organization={organization} onChanged={onChanged} />
      </div>

      {dialog === 'transfer' && <TransferDialog organization={organization} currentUserId={currentUserId} onClose={() => setDialog(null)} onChanged={onChanged} />}
      {dialog === 'archive' && <ArchiveDialog organization={organization} onClose={() => setDialog(null)} onChanged={onChanged} />}
    </section>
  );
}

function SettingRow({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <span className="icon-tile hidden h-9 w-9 shrink-0 rounded-lg sm:flex">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-white">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{description}</span>
      </span>
      <span className="shrink-0">{action}</span>
    </div>
  );
}

function ErrorText({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-3 text-sm text-[#F7A39A]" role="alert">
      {message}
    </p>
  );
}

function LeaveRow({ organization, onChanged }: { organization: AppOrganization; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const leave = useLeaveOrganization();

  async function confirm() {
    setError('');
    try {
      await leave.mutateAsync(organization.id);
      onChanged();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo salir de la organización'));
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-3 p-4">
      <SettingRow
        icon={<LogOut className="h-4 w-4" />}
        title="Salir de la organización"
        description="Dejarás de verla. Lo que hiciste (asignaciones, notas, historial) se conserva."
        action={
          confirming ? (
            <span className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={() => setConfirming(false)} disabled={leave.isPending}>
                No
              </button>
              <button type="button" className="btn-danger" onClick={confirm} disabled={leave.isPending}>
                Sí, salir de {organization.name}
              </button>
            </span>
          ) : (
            <button type="button" className="btn-danger" onClick={() => setConfirming(true)}>
              Salir
            </button>
          )
        }
      />
      <ErrorText message={error} />
    </div>
  );
}

function RestoreRow({ organization, onChanged }: { organization: AppOrganization; onChanged: () => void }) {
  const [error, setError] = useState('');
  const restore = useRestoreOrganization();

  async function run() {
    setError('');
    try {
      await restore.mutateAsync(organization.id);
      onChanged();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo restaurar la organización'));
    }
  }

  return (
    <div className="space-y-3 p-4">
      <SettingRow
        icon={<ArchiveRestore className="h-4 w-4" />}
        title="Restaurar la organización"
        description="Vuelve a quedar activa para todo el equipo."
        action={
          <button type="button" className="btn-primary" onClick={run} disabled={restore.isPending}>
            Restaurar
          </button>
        }
      />
      <ErrorText message={error} />
    </div>
  );
}

function TransferDialog({ organization, currentUserId, onClose, onChanged }: { organization: AppOrganization; currentUserId: string; onClose: () => void; onChanged: () => void }) {
  const membershipsQuery = useMemberships(organization.id);
  const candidates = (membershipsQuery.data || []).filter((member) => member.status === 'ACTIVE' && member.user.id !== currentUserId);
  const [membershipId, setMembershipId] = useState('');
  const [stepDown, setStepDown] = useState(true);
  const [error, setError] = useState('');
  const transfer = useTransferOrganization();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await transfer.mutateAsync({ id: organization.id, membershipId, stepDown });
      onClose();
      onChanged();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo transferir la propiedad'));
    }
  }

  return (
    <OverlayDialog title="Transferir la propiedad" subtitle={`Elige quién más será propietario de ${organization.name}.`} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {candidates.length === 0 && !membershipsQuery.isLoading ? (
          <p className="text-sm text-muted">Todavía no hay otras personas activas en la organización. Invita a alguien primero.</p>
        ) : (
          <label className="block">
            <span className="label">Nueva persona propietaria</span>
            <select className="select w-full" value={membershipId} onChange={(event) => setMembershipId(event.target.value)} required>
              <option value="">Elige a alguien del equipo</option>
              {candidates.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.user.name} ({formatRole(member.role)})
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-start gap-2.5 text-sm text-[#D8D5CE]">
          <input type="checkbox" className="mt-0.5" checked={stepDown} onChange={(event) => setStepDown(event.target.checked)} />
          <span>
            Dejar de ser propietario y quedar como <strong>Administrador</strong>. Si lo desmarcas, la organización tendrá dos propietarios.
          </span>
        </label>
        <ErrorText message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={!membershipId || transfer.isPending}>
            {transfer.isPending ? 'Transfiriendo...' : 'Transferir'}
          </button>
        </div>
      </form>
    </OverlayDialog>
  );
}

function ArchiveDialog({ organization, onClose, onChanged }: { organization: AppOrganization; onClose: () => void; onChanged: () => void }) {
  const [confirmName, setConfirmName] = useState('');
  const [error, setError] = useState('');
  const archive = useArchiveOrganization();
  const matches = confirmName.trim().toLowerCase() === organization.name.trim().toLowerCase();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await archive.mutateAsync({ id: organization.id, confirmName });
      onClose();
      onChanged();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo archivar la organización'));
    }
  }

  return (
    <OverlayDialog title="Archivar la organización" subtitle="Nadie podrá hacer cambios mientras esté archivada. No se borra nada." onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="label">
            Escribe <strong className="text-white">{organization.name}</strong> para confirmar
          </span>
          <input className="input" value={confirmName} onChange={(event) => setConfirmName(event.target.value)} autoComplete="off" />
        </label>
        <ErrorText message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-danger" disabled={!matches || archive.isPending}>
            {archive.isPending ? 'Archivando...' : 'Archivar'}
          </button>
        </div>
      </form>
    </OverlayDialog>
  );
}
