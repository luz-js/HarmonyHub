import { useMemo, useState } from 'react';
import { ChevronRight, Search, Users } from 'lucide-react';
import type { OrganizationMember } from '../../../shared/types';
import { getInitials } from '../../dashboard/utils';
import { InstrumentChips } from '../components/InstrumentChips';
import { MemberRoleBadge } from '../components/MemberRoleBadge';
import { MusicianDrawer } from '../components/MusicianDrawer';
import { useMemberships } from '../hooks';
import { countByRole, countByStatus, filterMembers, formatMemberSince, ROLE_FILTERS, RoleFilter, StatusTab } from '../utils/musicians.utils';

type MusiciansPageProps = {
  organizationId: string;
  currentUserId: string;
  /** Rol de quien mira en la organizacion activa: decide si puede editar rol y estado. */
  currentRole?: string;
};

export function MusiciansPage({ organizationId, currentUserId, currentRole }: MusiciansPageProps) {
  const membershipsQuery = useMemberships(organizationId);
  const [tab, setTab] = useState<StatusTab>('active');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const members = useMemo(() => membershipsQuery.data || [], [membershipsQuery.data]);
  const statusCounts = useMemo(() => countByStatus(members), [members]);
  const roleCounts = useMemo(() => countByRole(members, tab), [members, tab]);
  const visible = useMemo(() => filterMembers(members, { tab, role: roleFilter, search }), [members, tab, roleFilter, search]);
  // La ficha lee siempre la version mas reciente de la lista (despues de guardar se refresca sola).
  const selected = members.find((member) => member.id === selectedId) ?? null;
  const onlyMe = statusCounts.active === 1 && members.some((member) => member.status === 'ACTIVE' && member.user.id === currentUserId);
  const filtering = Boolean(search.trim()) || roleFilter !== 'all';

  return (
    <div className="space-y-5">
      <section>
        <h1 className="page-title">Músicos</h1>
        <p className="page-subtitle">Las personas de tu equipo y lo que tocan.</p>
      </section>

      <section className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input className="input pl-9" placeholder="Buscar por nombre o instrumento..." aria-label="Buscar músico" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <div className="flex shrink-0 gap-1 rounded-full border border-[#30333A] p-1" role="tablist" aria-label="Estado">
          {(['active', 'inactive'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className="tab-pill min-h-[32px] border-0 px-3"
              onClick={() => {
                setTab(value);
                setRoleFilter('all');
              }}
            >
              {value === 'active' ? 'Activos' : 'Inactivos'} <span className="text-xs opacity-80">{statusCounts[value]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Filtrar por rol">
        {ROLE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`tab-pill ${roleFilter === filter.value ? 'is-active' : ''}`}
            aria-pressed={roleFilter === filter.value}
            onClick={() => setRoleFilter(filter.value)}
          >
            {filter.label} <span className="text-xs opacity-80">{roleCounts[filter.value]}</span>
          </button>
        ))}
      </section>

      {membershipsQuery.isLoading && <section className="panel p-5 text-muted">Cargando músicos...</section>}
      {membershipsQuery.error instanceof Error && (
        <section className="rounded-xl border border-[#F27A6E]/30 bg-[#2A1817] p-4 text-sm text-[#F7A39A]">{membershipsQuery.error.message}</section>
      )}

      {!membershipsQuery.isLoading && !membershipsQuery.error && (
        <>
          {visible.length > 0 && (
            <section className="panel divide-y divide-[#23252A]" aria-label="Lista de músicos">
              {visible.map((member) => (
                <MusicianRow key={member.id} member={member} isMe={member.user.id === currentUserId} onOpen={() => setSelectedId(member.id)} />
              ))}
            </section>
          )}

          {visible.length === 0 && (
            <p className="rounded-2xl border border-dashed border-[#30333A] px-6 py-8 text-center text-sm text-muted">
              {filtering ? 'Nadie coincide con la búsqueda o el filtro.' : tab === 'inactive' ? 'No hay personas inactivas.' : 'No hay músicos en esta organización.'}
            </p>
          )}

          {tab === 'active' && onlyMe && !filtering && (
            <div className="rounded-2xl border border-dashed border-[#30333A] bg-[#141518] px-6 py-10 text-center">
              <span className="icon-tile mx-auto h-12 w-12 rounded-2xl">
                <Users className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-white">Por ahora solo estás tú</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">Cuando invites a tu equipo, aparecerán aquí con lo que tocan.</p>
            </div>
          )}
        </>
      )}

      {selected && (
        <MusicianDrawer
          member={selected}
          organizationId={organizationId}
          currentUserId={currentUserId}
          actorRole={currentRole}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function MusicianRow({ member, isMe, onOpen }: { member: OrganizationMember; isMe: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.03] sm:px-5"
      onClick={onOpen}
      aria-label={`Ver ficha de ${member.user.name}`}
    >
      <span className="avatar h-10 w-10 shrink-0 text-sm">{getInitials(member.user.name)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-white">{member.user.name}</span>
          {isMe && <span className="badge badge-primary shrink-0">Tú</span>}
        </span>
        <span className="block text-xs text-muted">{formatMemberSince(member.joinedAt)}</span>
        {/* En el celular solo cabe el principal; en pantallas grandes se ven todos. */}
        <span className="mt-1.5 block sm:hidden">
          <InstrumentChips instruments={member.user.instruments} limit={1} />
        </span>
      </span>
      <span className="hidden min-w-0 max-w-[45%] sm:block">
        <InstrumentChips instruments={member.user.instruments} limit={4} />
      </span>
      <MemberRoleBadge role={member.role} />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
    </button>
  );
}
