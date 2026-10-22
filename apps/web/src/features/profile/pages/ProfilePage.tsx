import { FormEvent, useState } from 'react';
import { ArrowRight, Check, PartyPopper, Star, X } from 'lucide-react';
import { useCurrentUser, useSaveMyProfile } from '../../auth/hooks';
import { UnavailabilitySection } from '../../availability/components/UnavailabilitySection';
import { getInitials } from '../../dashboard/utils';
import { getRoleLabel } from '../../setlists/assignments/utils/assignmentLabels';
import type { CurrentUser } from '../../../shared/types';
import { INSTRUMENT_GROUPS, makePrimary, removeInstrument, SelectedInstrument, toggleInstrument } from '../utils/instrumentGroups';

type ProfilePageProps = {
  /** Avisa a App del nombre nuevo para que el menu de la cuenta lo muestre sin recargar. */
  onUserUpdated?: (user: { name: string }) => void;
  /**
   * Para quien todavia no tiene organizacion: al guardar se muestra "Tu perfil esta completo" con el boton
   * "Entrar", que lleva a la bienvenida. Sin esto (ya tiene organizacion) solo se ve "Cambios guardados".
   */
  onEnter?: () => void;
};

export function ProfilePage({ onUserUpdated, onEnter }: ProfilePageProps) {
  const userQuery = useCurrentUser();
  // Viven aqui y no en el formulario: al guardar, el formulario se vuelve a montar con los datos nuevos.
  const [justSaved, setJustSaved] = useState(false);
  const [completed, setCompleted] = useState(false);

  return (
    <div className="space-y-5">
      <section>
        <h1 className="page-title">Mi perfil</h1>
        <p className="page-subtitle">Tus datos, lo que sabes tocar y cuándo no estás disponible. Así te ven las personas de tus equipos.</p>
      </section>

      {userQuery.isLoading && <section className="panel p-5 text-muted">Cargando tu perfil...</section>}
      {userQuery.error instanceof Error && (
        <section className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-4 text-sm text-[#F7A39A]">{userQuery.error.message}</section>
      )}
      {/* La clave reinicia el formulario cuando llegan datos nuevos del servidor (al cargar o despues de guardar). */}
      {userQuery.data && (
        <ProfileForm
          key={profileKey(userQuery.data)}
          user={userQuery.data}
          justSaved={justSaved}
          onSavedChange={(saved) => {
            setJustSaved(saved);
            if (saved && onEnter) setCompleted(true);
          }}
          onUserUpdated={onUserUpdated}
          showSavedMessage={!onEnter}
        />
      )}
      {/* Aparte del formulario: cada fecha se guarda o se borra al momento, sin "Guardar cambios". */}
      {userQuery.data && <UnavailabilitySection />}

      {completed && onEnter && <ProfileCompletedNotice onEnter={onEnter} onClose={() => setCompleted(false)} />}
    </div>
  );
}

/** Aviso fijo abajo (se ve sin bajar ni subir): el perfil quedo listo y "Entrar" lleva a la bienvenida. */
function ProfileCompletedNotice({ onEnter, onClose }: { onEnter: () => void; onClose: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div
        role="status"
        aria-label="Perfil completo"
        className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-[var(--primary)] bg-[#0F2A25] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--on-primary)]">
          <PartyPopper className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white">¡Listo, tu perfil está completo!</p>
          <p className="mt-1 text-sm text-[#C9E9E1]">Ahora puedes crear tu organización o aceptar la invitación de tu equipo cuando te llegue.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-primary h-9 px-4 text-sm" onClick={onEnter}>
              Entrar <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" className="btn-ghost h-9 px-3 text-sm" onClick={onClose}>
              Seguir editando
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function profileKey(user: CurrentUser) {
  return [user.id, user.name, user.phone ?? '', ...(user.instruments || []).map((item) => `${item.instrument}:${item.isPrimary}`)].join('|');
}

function initialInstruments(user: CurrentUser): SelectedInstrument[] {
  return (user.instruments || []).map(({ instrument, isPrimary }) => ({ instrument, isPrimary }));
}

type ProfileFormProps = {
  user: CurrentUser;
  justSaved: boolean;
  onSavedChange: (saved: boolean) => void;
  onUserUpdated?: ProfilePageProps['onUserUpdated'];
  /** "Cambios guardados." debajo del formulario (sin organizacion se muestra el aviso de perfil completo). */
  showSavedMessage: boolean;
};

function ProfileForm({ user, justSaved, onSavedChange, onUserUpdated, showSavedMessage }: ProfileFormProps) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [instruments, setInstruments] = useState<SelectedInstrument[]>(() => initialInstruments(user));
  const [error, setError] = useState('');
  const saveProfile = useSaveMyProfile();

  const dirty =
    name !== user.name ||
    phone !== (user.phone ?? '') ||
    JSON.stringify(instruments) !== JSON.stringify(initialInstruments(user));

  function change<T>(setter: (value: T) => void) {
    return (value: T) => {
      onSavedChange(false);
      setError('');
      setter(value);
    };
  }
  const updateInstruments = change(setInstruments);

  function cancel() {
    setName(user.name);
    setPhone(user.phone ?? '');
    setInstruments(initialInstruments(user));
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Escribe tu nombre.');
      return;
    }
    try {
      const result = await saveProfile.mutateAsync({ profile: { name: name.trim(), phone: phone.trim() || null }, instruments: { instruments } });
      onSavedChange(true);
      onUserUpdated?.({ name: result.user.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios');
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="panel space-y-4 p-5" aria-labelledby="profile-data-title">
          <h2 id="profile-data-title" className="section-title">Tus datos</h2>
          <div className="flex items-center gap-4">
            <span className="avatar h-16 w-16 shrink-0 text-xl">{getInitials(name || user.name)}</span>
            <p className="text-sm text-muted">Por ahora se muestran tus iniciales. Pronto podrás subir una foto.</p>
          </div>
          <label className="block">
            <span className="label">Nombre</span>
            <input className="input" value={name} onChange={(event) => change(setName)(event.target.value)} maxLength={120} required />
          </label>
          <div>
            <label className="block">
              <span className="label">Correo</span>
              <input className="input opacity-70" value={user.email} readOnly aria-describedby="profile-email-hint" />
            </label>
            <p id="profile-email-hint" className="mt-1.5 text-xs text-muted">Es con lo que entras a la app; no se cambia aquí.</p>
          </div>
          <div>
            <label className="block">
              <span className="label">Teléfono</span>
              <input className="input" type="tel" value={phone} onChange={(event) => change(setPhone)(event.target.value)} maxLength={40} aria-describedby="profile-phone-hint" />
            </label>
            <p id="profile-phone-hint" className="mt-1.5 text-xs text-muted">Lo ven las personas de tus equipos.</p>
          </div>
        </section>

        <section className="panel space-y-5 p-5" aria-labelledby="profile-instruments-title">
          <div>
            <h2 id="profile-instruments-title" className="section-title">Lo que toco</h2>
            <p className="mt-1 text-sm text-muted">Marca todo lo que sabes tocar. La estrella indica tu instrumento principal.</p>
          </div>

          {instruments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#30333A] px-4 py-3 text-sm text-muted">Todavía no marcaste ningún instrumento.</p>
          ) : (
            <ul className="flex flex-wrap gap-2" aria-label="Instrumentos elegidos">
              {instruments.map((item) => {
                const label = getRoleLabel(item.instrument);
                return (
                  <li
                    key={item.instrument}
                    className={`flex items-center gap-1.5 rounded-full border py-1 pl-3 pr-1 text-sm font-semibold ${
                      item.isPrimary ? 'border-[var(--primary)] bg-[var(--primary-tint)] text-[var(--primary)]' : 'border-[#30333A] bg-[#1A1B1F] text-[#D8D5CE]'
                    }`}
                  >
                    {item.isPrimary && <Star className="h-3.5 w-3.5 fill-current" aria-label="Principal" />}
                    <span>{label}</span>
                    {!item.isPrimary && (
                      <button
                        type="button"
                        className="rounded-full px-2 py-1 text-xs font-semibold text-muted hover:bg-white/5 hover:text-white"
                        onClick={() => updateInstruments(makePrimary(instruments, item.instrument))}
                      >
                        Hacer principal
                      </button>
                    )}
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-white"
                      aria-label={`Quitar ${label}`}
                      onClick={() => updateInstruments(removeInstrument(instruments, item.instrument))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="space-y-4">
            {INSTRUMENT_GROUPS.map((group) => (
              <fieldset key={group.title}>
                <legend className="label">{group.title}</legend>
                <div className="flex flex-wrap gap-2">
                  {group.roles.map((role) => {
                    const selected = instruments.some((item) => item.instrument === role);
                    return (
                      <button
                        key={role}
                        type="button"
                        className={`tab-pill ${selected ? 'is-active' : ''}`}
                        aria-pressed={selected}
                        onClick={() => updateInstruments(toggleInstrument(instruments, role))}
                      >
                        {selected && <Check className="h-3.5 w-3.5" />}
                        {getRoleLabel(role)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </section>
      </div>

      {error && <p className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-3 text-sm text-[#F7A39A]" role="alert">{error}</p>}
      {showSavedMessage && justSaved && !dirty && <p className="text-sm font-semibold text-[var(--primary)]" role="status">Cambios guardados.</p>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-ghost" onClick={cancel} disabled={!dirty || saveProfile.isPending}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={!dirty || saveProfile.isPending}>
          {saveProfile.isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
