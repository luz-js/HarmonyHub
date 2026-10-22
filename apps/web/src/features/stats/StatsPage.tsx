import { useState } from 'react';
import { LoaderCircle, Music2, Users } from 'lucide-react';
import { STATS_PERIOD_MONTHS } from '@harmonyhub/contracts';
import { getCurrentOrganizationId } from '../../shared/api/http';
import type { StatsPeriodMonths } from '../../shared/types';
import { canManageEventsClientSide } from '../events/utils';
import { MemberLoadSection } from './components/MemberLoadSection';
import { RepertoireSection } from './components/RepertoireSection';
import { useMemberLoadStats, useRepertoireStats } from './hooks';

type Navigate = (href: string) => void;
type Tab = 'repertoire' | 'members';

function Loading() {
  return (
    <p className="flex items-center gap-2 text-sm text-muted">
      <LoaderCircle className="h-4 w-4 animate-spin" /> Calculando…
    </p>
  );
}

function ErrorText({ error }: { error: unknown }) {
  return <p role="alert" className="text-sm text-[#F7A39A]">{error instanceof Error ? error.message : 'No se pudieron cargar las estadísticas.'}</p>;
}

/** Estadisticas de la organizacion activa: repertorio (todos) y carga por musico (quien arma equipos). */
export function StatsPage({ navigate, role }: { navigate: Navigate; role?: string }) {
  const organizationId = getCurrentOrganizationId() || '';
  const canSeeMembers = canManageEventsClientSide(role);
  const [months, setMonths] = useState<StatsPeriodMonths>(6);
  const [tab, setTab] = useState<Tab>('repertoire');
  const showingMembers = canSeeMembers && tab === 'members';

  const repertoire = useRepertoireStats(organizationId, months);
  const members = useMemberLoadStats(organizationId, months, showingMembers);

  return (
    <div className="space-y-5">
      <section>
        <h1 className="page-title">Estadísticas</h1>
        <p className="page-subtitle">Qué se toca, qué quedó olvidado y cómo se reparte el servicio en el equipo.</p>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        {canSeeMembers && (
          <div className="flex gap-2" role="tablist" aria-label="Estadísticas">
            <button role="tab" type="button" aria-selected={!showingMembers} className="tab-pill" onClick={() => setTab('repertoire')}>
              <Music2 className="h-4 w-4" /> Repertorio
            </button>
            <button role="tab" type="button" aria-selected={showingMembers} className="tab-pill" onClick={() => setTab('members')}>
              <Users className="h-4 w-4" /> Carga por músico
            </button>
          </div>
        )}
        <div className="flex gap-2" role="radiogroup" aria-label="Periodo">
          {STATS_PERIOD_MONTHS.map((value) => (
            <button key={value} role="radio" type="button" aria-checked={months === value} className="tab-pill" onClick={() => setMonths(value)}>
              {value} meses
            </button>
          ))}
        </div>
      </section>

      {showingMembers ? (
        members.isLoading ? <Loading /> : members.isError ? <ErrorText error={members.error} /> : members.data && <MemberLoadSection stats={members.data} />
      ) : repertoire.isLoading ? (
        <Loading />
      ) : repertoire.isError ? (
        <ErrorText error={repertoire.error} />
      ) : (
        repertoire.data && <RepertoireSection stats={repertoire.data} navigate={navigate} />
      )}
    </div>
  );
}
