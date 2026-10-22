import { FormEvent, useState } from 'react';
import { ArrowLeft, LogOut, Music2, Users } from 'lucide-react';
import { MyInvitationsBanner } from '../features/invitations/components/MyInvitationsBanner';
import { useCreateOrganization } from '../features/organizations/hooks';
import type { AppOrganization, AppUser } from './types';

const ORGANIZATION_TYPES: Array<[string, string]> = [
  ['BAND', 'Banda'],
  ['MINISTRY', 'Ministerio'],
  ['ACOUSTIC_GROUP', 'Grupo acústico'],
  ['ORCHESTRA', 'Orquesta'],
  ['OTHER', 'Otro'],
];

/** Primer paso despues de registrarse (o "Nueva organizacion" desde el selector): crea la organizacion y entra como OWNER. */
export function OnboardingPage({
  user,
  onCreated,
  onCancel,
  onLogout,
  onOpenInvitations,
}: {
  user: AppUser;
  onCreated: (organization: AppOrganization) => void;
  onCancel?: () => void;
  onLogout: () => void;
  /** Si la invitaron a una organizacion, puede unirse en vez de crear una. */
  onOpenInvitations?: () => void;
}) {
  const createMutation = useCreateOrganization();
  const [name, setName] = useState('');
  const [type, setType] = useState('BAND');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('El nombre es requerido.');
      return;
    }
    try {
      const created = await createMutation.mutateAsync({ name: name.trim(), type, description: description.trim() || undefined });
      onCreated({ id: created.id, slug: created.slug, name: created.name, role: 'OWNER' });
    } catch (err: any) {
      setError(err?.message || 'No se pudo crear la organización');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-white subtle-grid">
      <section className="panel w-full max-w-[540px] p-6 shadow-soft sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary text-on-primary"><Music2 className="h-5 w-5" /></span>
            <span className="font-display text-xl font-bold">HarmonyHub</span>
          </div>
          {onCancel ? (
            <button className="btn-ghost h-8 px-2 text-xs" onClick={onCancel}><ArrowLeft className="h-3.5 w-3.5" /> Volver</button>
          ) : (
            <button className="btn-ghost h-8 px-2 text-xs" onClick={onLogout}><LogOut className="h-3.5 w-3.5" /> Salir</button>
          )}
        </div>

        <div className="mt-8">
          <h1 className="text-[28px] font-bold leading-tight text-white">{onCancel ? 'Nueva organización' : `¡Hola, ${user.name.split(' ')[0]}!`}</h1>
          <p className="mt-2 text-sm text-muted">
            Crea el espacio de tu banda o ministerio. Vas a ser su propietario y podrás invitar a tu equipo después.
          </p>
        </div>

        {onOpenInvitations && (
          <div className="mt-6">
            <MyInvitationsBanner onOpen={onOpenInvitations} />
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="label">Nombre de la organización</span>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ministerio de Alabanza Renacer" maxLength={120} required />
          </label>
          <label className="block">
            <span className="label">Tipo</span>
            <select className="select" value={type} onChange={(event) => setType(event.target.value)}>
              {ORGANIZATION_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Descripción (opcional)</span>
            <textarea className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
          </label>
          {error && <div className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-3 text-sm text-[#F7A39A]">{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creando...' : 'Crear organización'}
          </button>
        </form>

        {!onCancel && (
          <p className="mt-6 flex items-start gap-2 text-xs text-muted">
            <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ¿Te van a sumar a un equipo que ya existe? Pídele a tu líder que te invite con el correo {user.email}.
          </p>
        )}
      </section>
    </main>
  );
}
