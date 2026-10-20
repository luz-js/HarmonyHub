import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useOrganizations } from '../features/organizations/hooks';
import { getInitials } from '../features/dashboard/utils';
import { getRoleLabel } from './session';
import type { AppOrganization, AppUser } from './types';

/**
 * Selector de organizacion activa: lista las membresias activas del usuario.
 * `sidebar` ocupa todo el ancho de la barra lateral; `compact` cabe en la barra superior del celular.
 */
export function OrganizationSwitcher({
  user,
  onSwitch,
  onCreateNew,
  variant = 'sidebar',
}: {
  user: AppUser;
  onSwitch: (organization: AppOrganization) => void;
  onCreateNew: () => void;
  variant?: 'sidebar' | 'compact';
}) {
  const [open, setOpen] = useState(false);
  const organizationsQuery = useOrganizations();

  const organizations = useMemo<AppOrganization[]>(() => {
    const rows = organizationsQuery.data;
    if (!rows) return user.organizations || [];
    return rows.map((row) => ({ id: row.organization.id, slug: row.organization.slug, name: row.organization.name, role: row.role }));
  }, [organizationsQuery.data, user.organizations]);

  const current = organizations.find((organization) => organization.id === user.currentOrganizationId);
  const name = current?.name || 'Organización';
  const compact = variant === 'compact';

  return (
    <div className={`relative ${compact ? 'min-w-0 flex-1' : 'w-full'}`}>
      <button
        type="button"
        className={`flex w-full items-center gap-3 rounded-xl border border-[#30333A] bg-[#1A1B1F] text-left transition hover:border-[#3D4048] ${compact ? 'h-11 px-2' : 'px-3 py-2.5'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-[13px] font-bold text-primary">{getInitials(name)}</span>
        <span className="min-w-0 flex-1">
          {!compact && <span className="block text-xs text-muted">Organización</span>}
          <span className="block truncate text-sm font-bold text-white">{name}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Cerrar" onClick={() => setOpen(false)} />
          <div
            className={`absolute z-50 mt-2 rounded-xl border border-[#30333A] bg-[#1A1B1F] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.55)] ${compact ? 'left-0 w-72 max-w-[calc(100vw-32px)]' : 'left-0 right-0'}`}
            role="listbox"
          >
            {organizations.map((organization) => {
              const active = organization.id === user.currentOrganizationId;
              return (
                <button
                  key={organization.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-white/5"
                  onClick={() => {
                    setOpen(false);
                    if (!active) onSwitch(organization);
                  }}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#23252A] text-xs font-bold text-[#D8D5CE]">{getInitials(organization.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-white">{organization.name}</span>
                    <span className="block text-xs text-muted">{getRoleLabel(organization.role)}</span>
                  </span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
            <div className="my-1 border-t border-[#30333A]" />
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm font-semibold text-primary hover:bg-white/5"
              onClick={() => {
                setOpen(false);
                onCreateNew();
              }}
            >
              <Plus className="h-4 w-4" /> Nueva organización
            </button>
          </div>
        </>
      )}
    </div>
  );
}
