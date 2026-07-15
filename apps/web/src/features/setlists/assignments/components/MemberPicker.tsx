import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useMemberships } from '../../../musicians/hooks';

type MembershipRow = {
  id: string;
  role: string;
  status: string;
  instrument: string | null;
  user: { id: string; name: string; avatarUrl: string | null; active: boolean };
};

/** Selector de miembros para agregar como participante del setlist: reusa GET /api/memberships filtrando client-side. */
export function MemberPicker({
  organizationId,
  excludeMembershipIds,
  onSelect,
}: {
  organizationId: string;
  excludeMembershipIds: string[];
  onSelect: (membershipId: string) => void;
}) {
  const membershipsQuery = useMemberships(organizationId);
  const [search, setSearch] = useState('');

  const members = useMemo(() => {
    const rows = (membershipsQuery.data as MembershipRow[] | undefined) || [];
    return rows.filter((row) => row.status === 'ACTIVE' && row.user?.active && !excludeMembershipIds.includes(row.id));
  }, [membershipsQuery.data, excludeMembershipIds]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) => member.user.name.toLowerCase().includes(term));
  }, [members, search]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input className="input pl-8" placeholder="Buscar musico..." value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
        {filtered.map((member) => (
          <button
            key={member.id}
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left text-sm text-white hover:border-[#1b2c40] hover:bg-white/5"
            onClick={() => onSelect(member.id)}
          >
            <span className="truncate">{member.user.name}</span>
            <span className="shrink-0 text-xs text-muted">{member.instrument || member.role}</span>
          </button>
        ))}
        {filtered.length === 0 && <p className="px-2 py-3 text-xs text-muted">No hay musicos disponibles.</p>}
      </div>
    </div>
  );
}
