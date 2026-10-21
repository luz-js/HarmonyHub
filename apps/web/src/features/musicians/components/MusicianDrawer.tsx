import { FormEvent, ReactNode, useState } from 'react';
import { Check, Copy, Mail, Phone, X } from 'lucide-react';
import type { MembershipRole, MembershipStatus, OrganizationMember } from '../../../shared/types';
import { formatRole } from '../../../shared/utils/format';
import { getInitials } from '../../dashboard/utils';
import { useUpdateMembership } from '../hooks';
import { assignableRoles, canEditMember, canManageMembers, formatMemberSince } from '../utils/musicians.utils';
import { InstrumentChips } from './InstrumentChips';
import { MemberRoleBadge } from './MemberRoleBadge';

type MusicianDrawerProps = {
  member: OrganizationMember;
  organizationId: string;
  currentUserId: string;
  /** Rol de quien mira la ficha en la organizacion activa. */
  actorRole?: string;
  onClose: () => void;
};

/** "Ficha del músico": contacto, lo que toca segun su perfil y, para propietarios/administradores, rol y estado. */
export function MusicianDrawer({ member, organizationId, currentUserId, actorRole, onClose }: MusicianDrawerProps) {
  const isMe = member.user.id === currentUserId;
  const firstName = member.user.name.split(' ')[0];

  return (
    <>
      <button type="button" aria-label="Cerrar ficha" className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="musician-drawer-title"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[420px] overflow-y-auto border-l border-[#30333A] bg-[#1A1B1F] p-5 shadow-[0_0_60px_rgba(0,0,0,0.5)]"
        onKeyDown={(event) => event.key === 'Escape' && onClose()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ficha del músico</p>
          <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={onClose} aria-label="Cerrar" autoFocus>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="avatar h-14 w-14 shrink-0 text-lg">{getInitials(member.user.name)}</span>
          <div className="min-w-0">
            <h2 id="musician-drawer-title" className="truncate font-display text-xl font-semibold text-white">
              {member.user.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <MemberRoleBadge role={member.role} />
              <span>{formatMemberSince(member.joinedAt)}</span>
              {member.status !== 'ACTIVE' && <span className="badge badge-neutral">Inactivo</span>}
            </div>
          </div>
        </div>

        <section className="mt-6 space-y-2" aria-labelledby="musician-contact-title">
          <h3 id="musician-contact-title" className="label">Contacto</h3>
          <ContactRow icon={<Mail className="h-4 w-4" />} value={member.user.email} action={<CopyButton value={member.user.email} />} />
          <ContactRow
            icon={<Phone className="h-4 w-4" />}
            value={member.user.phone || 'Sin teléfono'}
            muted={!member.user.phone}
            action={
              member.user.phone ? (
                <a className="btn-ghost min-h-0 px-3 py-1.5 text-xs" href={`tel:${member.user.phone.replace(/\s+/g, '')}`}>
                  Llamar
                </a>
              ) : null
            }
          />
        </section>

        <section className="mt-6 space-y-2" aria-labelledby="musician-instruments-title">
          <h3 id="musician-instruments-title" className="label">Lo que toca</h3>
          <InstrumentChips instruments={member.user.instruments} />
          <p className="text-xs text-muted">{isMe ? 'Los eliges tú en Mi perfil.' : `Los elige ${firstName} en su perfil.`}</p>
        </section>

        {canEditMember(actorRole, member) ? (
          <MemberEditForm key={`${member.id}:${member.role}:${member.status}`} member={member} organizationId={organizationId} actorRole={actorRole} />
        ) : (
          canManageMembers(actorRole) && (
            <p className="mt-6 rounded-xl border border-[#30333A] p-3 text-xs text-muted">Solo un propietario puede editar a otro propietario.</p>
          )
        )}
      </aside>
    </>
  );
}

function ContactRow({ icon, value, action, muted }: { icon: ReactNode; value: string; action: ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#30333A] px-3 py-2">
      <span className="shrink-0 text-muted">{icon}</span>
      <span className={`min-w-0 flex-1 truncate text-sm ${muted ? 'text-muted' : 'text-white'}`}>{value}</span>
      {action}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="btn-ghost min-h-0 px-3 py-1.5 text-xs" onClick={copy}>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

function MemberEditForm({ member, organizationId, actorRole }: { member: OrganizationMember; organizationId: string; actorRole?: string }) {
  const [role, setRole] = useState<MembershipRole>(member.role);
  const [status, setStatus] = useState<MembershipStatus>(member.status);
  const [error, setError] = useState('');
  const updateMembership = useUpdateMembership(organizationId);
  // Si ya es propietario se muestra igual, aunque quien edita no pueda asignar ese rol.
  const roles = assignableRoles(actorRole);
  const roleOptions = roles.includes(member.role) ? roles : [member.role, ...roles];
  const dirty = role !== member.role || status !== member.status;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await updateMembership.mutateAsync({
        id: member.id,
        input: { ...(role !== member.role && { role }), ...(status !== member.status && { status }) },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios');
    }
  }

  function cancel() {
    setRole(member.role);
    setStatus(member.status);
    setError('');
  }

  return (
    <form className="mt-6 space-y-4 border-t border-[#30333A] pt-5" onSubmit={submit} aria-labelledby="musician-edit-title">
      <h3 id="musician-edit-title" className="section-title">Editar</h3>
      <label className="block">
        <span className="label">Rol</span>
        <select className="select w-full" value={role} onChange={(event) => setRole(event.target.value as MembershipRole)}>
          {roleOptions.map((value) => (
            <option key={value} value={value}>
              {formatRole(value)}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend className="label">Estado</legend>
        <div className="flex gap-2">
          {(['ACTIVE', 'INACTIVE'] as const).map((value) => (
            <button key={value} type="button" className={`tab-pill ${status === value ? 'is-active' : ''}`} aria-pressed={status === value} onClick={() => setStatus(value)}>
              {value === 'ACTIVE' ? 'Activo' : 'Inactivo'}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-muted">
        Un inactivo deja de ver la organización, pero sus asignaciones pasadas se conservan. La organización nunca puede quedarse sin propietario.
      </p>
      {error && (
        <p className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-3 text-sm text-[#F7A39A]" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={cancel} disabled={!dirty || updateMembership.isPending}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={!dirty || updateMembership.isPending}>
          {updateMembership.isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
