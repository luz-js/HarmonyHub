import { useState } from 'react';
import { Check, Copy, Link2, LoaderCircle, Trash2 } from 'lucide-react';
import { OverlayDialog } from '../../../../shared/components/OverlayDialog';
import type { CreatedShareLink, ShareLink, ShareLinkDuration } from '../../../../shared/types';
import { useCreateShareLink, useRevokeShareLink, useShareLinks } from '../../hooks/useShareLinks';
import { sharedSetlistUrl } from '../../utils/shareLinks';

const DURATIONS: Array<{ value: ShareLinkDuration; label: string }> = [
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'never', label: 'Sin vencimiento' },
];

const formatDate = (value: string) => new Date(value).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });

function describeLink(link: ShareLink) {
  return [
    `Creado el ${formatDate(link.createdAt)}${link.createdBy ? ` por ${link.createdBy.name}` : ''}`,
    link.expiresAt ? `vence el ${formatDate(link.expiresAt)}` : 'sin vencimiento',
    link.lastAccessedAt ? `último acceso el ${formatDate(link.lastAccessedAt)}` : 'todavía nadie lo abrió',
  ].join(' · ');
}

type ShareSetlistDialogProps = { organizationId: string; setlistId: string; setlistName: string; onClose: () => void };

/**
 * Enlaces de solo lectura del setlist: crear uno (se ve y se copia una sola vez), ver los activos y revocarlos.
 * Quien tenga el enlace ve el orden, las tonalidades y la letra con acordes; nada del equipo ni de la organizacion.
 */
export function ShareSetlistDialog({ organizationId, setlistId, setlistName, onClose }: ShareSetlistDialogProps) {
  const [duration, setDuration] = useState<ShareLinkDuration>('30d');
  const [created, setCreated] = useState<CreatedShareLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const links = useShareLinks(organizationId, setlistId);
  const createMutation = useCreateShareLink(organizationId, setlistId);
  const revokeMutation = useRevokeShareLink(organizationId, setlistId);

  async function handleCreate() {
    setError('');
    setCopied(false);
    try {
      setCreated(await createMutation.mutateAsync({ duration }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el enlace');
    }
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError('No se pudo copiar; selecciona el enlace y cópialo a mano.');
    }
  }

  async function handleRevoke(link: ShareLink) {
    if (!window.confirm('¿Revocar este enlace? Quien lo tenga ya no podrá abrir el setlist.')) return;
    setError('');
    try {
      await revokeMutation.mutateAsync(link.id);
      if (created?.id === link.id) setCreated(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo revocar el enlace');
    }
  }

  const url = created ? sharedSetlistUrl(created.token) : '';
  const active = links.data?.items ?? [];

  return (
    <OverlayDialog
      title="Compartir setlist"
      subtitle={`Quien tenga el enlace ve "${setlistName}" sin iniciar sesión: el orden, las tonalidades y la letra con acordes. No ve al equipo, notas, archivos ni pistas.`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <section className="space-y-3">
          <label className="block">
            <span className="label">Vence</span>
            <select className="select" value={duration} onChange={(event) => setDuration(event.target.value as ShareLinkDuration)}>
              {DURATIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-primary" disabled={createMutation.isPending} onClick={() => void handleCreate()}>
            {createMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Crear enlace
          </button>
        </section>

        {created && (
          <section className="space-y-2 rounded-xl border border-[#3D4048] bg-[#1B1C20] p-3.5" aria-label="Enlace nuevo">
            <p className="text-sm font-semibold text-white">Copia el enlace ahora: por seguridad no se vuelve a mostrar.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className="input min-w-0 flex-1 font-mono text-xs" readOnly value={url} aria-label="Enlace para compartir" onFocus={(event) => event.target.select()} />
              <button type="button" className="btn-ghost" onClick={() => void handleCopy(url)}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </section>
        )}

        {error && <p role="alert" className="text-sm text-[#F7A39A]">{error}</p>}

        <section className="space-y-2">
          <h4 className="text-sm font-bold text-white">Enlaces activos</h4>
          {links.isLoading ? (
            <p className="text-sm text-muted">Cargando…</p>
          ) : links.isError ? (
            <p className="text-sm text-[#F7A39A]">No se pudieron cargar los enlaces.</p>
          ) : active.length === 0 ? (
            <p className="text-sm text-muted">No hay enlaces activos.</p>
          ) : (
            <ul className="space-y-2">
              {active.map((link) => (
                <li key={link.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#2A2C31] p-3">
                  <span className="min-w-0 text-[13px] text-[#D8D5CE]">{describeLink(link)}</span>
                  <button type="button" className="btn-ghost shrink-0" disabled={revokeMutation.isPending} onClick={() => void handleRevoke(link)}>
                    <Trash2 className="h-4 w-4" /> Revocar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </OverlayDialog>
  );
}
