import { FormEvent, useState } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { OverlayDialog } from '../../../shared/components/OverlayDialog';
import type { MembershipRole } from '../../../shared/types';
import { formatRole } from '../../../shared/utils/format';
import { assignableRoles } from '../../musicians/utils/musicians.utils';
import { useCreateInvitation } from '../hooks';

type InviteMemberDialogProps = {
  organizationId: string;
  /** Rol de quien invita: solo un propietario puede invitar como propietario. */
  actorRole?: string;
  onClose: () => void;
};

/** Crea una invitacion. No se envian correos todavia: la persona la ve al entrar a HarmonyHub con ese correo. */
export function InviteMemberDialog({ organizationId, actorRole, onClose }: InviteMemberDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MembershipRole>('MUSICIAN');
  const [error, setError] = useState('');
  const [invited, setInvited] = useState<{ email: string; role: MembershipRole } | null>(null);
  const createInvitation = useCreateInvitation(organizationId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const invitation = await createInvitation.mutateAsync({ organizationId, email: email.trim(), role });
      setInvited({ email: invitation.email, role: invitation.role });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la invitación');
    }
  }

  function inviteAnother() {
    setInvited(null);
    setEmail('');
    setRole('MUSICIAN');
  }

  return (
    <OverlayDialog title="Invitar a tu equipo" subtitle="La persona se une a esta organización con el rol que elijas." onClose={onClose}>
      {invited ? (
        <div className="space-y-4" role="status">
          <p className="flex items-start gap-2.5 text-[15px] text-white">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
            <span>
              Listo: invitaste a <strong>{invited.email}</strong> como {formatRole(invited.role).toLowerCase()}.
            </span>
          </p>
          <HowToJoinNote email={invited.email} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={inviteAnother}>
              Invitar a otra persona
            </button>
            <button type="button" className="btn-primary" onClick={onClose}>
              Listo
            </button>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="label">Correo</span>
            <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" required autoFocus />
          </label>
          <label className="block">
            <span className="label">Rol</span>
            <select className="select w-full" value={role} onChange={(event) => setRole(event.target.value as MembershipRole)}>
              {assignableRoles(actorRole).map((value) => (
                <option key={value} value={value}>
                  {formatRole(value)}
                </option>
              ))}
            </select>
          </label>
          <HowToJoinNote />
          {error && (
            <p className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-3 text-sm text-[#F7A39A]" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={createInvitation.isPending || !email.trim()}>
              {createInvitation.isPending ? 'Invitando...' : 'Crear invitación'}
            </button>
          </div>
        </form>
      )}
    </OverlayDialog>
  );
}

function HowToJoinNote({ email }: { email?: string }) {
  return (
    <p className="flex items-start gap-2.5 rounded-xl border border-[#8FB4FF]/20 bg-[#1C2436] px-4 py-3 text-sm text-[#C9D8FF]">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#8FB4FF]" />
      <span>
        Todavía no enviamos correos: avísale tú. Cuando entre a HarmonyHub (o cree su cuenta) con {email ? <strong>{email}</strong> : 'ese correo'}, la verá en
        «Mis invitaciones» para unirse. Vence en 7 días.
      </span>
    </p>
  );
}
