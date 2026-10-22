import { AlertTriangle, CalendarOff, Moon } from 'lucide-react';
import { getRoleLabel } from '../../../app/session';
import type { MemberLoadStat, MemberLoadStats } from '../../../shared/types';
import { formatStatsDate, sinceLabel } from '../statsFormat';

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[4.5rem]">
      <p className="text-lg font-bold leading-none text-white">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

function MemberCard({ member }: { member: MemberLoadStat }) {
  return (
    <li className="panel space-y-3 p-4" aria-label={member.name}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-white">{member.name}</p>
          <p className="text-xs text-muted">{getRoleLabel(member.role)}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {member.overloaded && (
            <span className="badge badge-orange">
              <AlertTriangle className="h-3.5 w-3.5" /> Sobrecargado
            </span>
          )}
          {member.idle && (
            <span className="badge badge-blue">
              <Moon className="h-3.5 w-3.5" /> Sin servicio hace tiempo
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        <Figure label="en el equipo" value={member.inTeam} />
        <Figure label="confirmados" value={member.confirmed} />
        <Figure label="rechazados" value={member.declined} />
        <Figure label="próximos" value={member.upcoming} />
      </div>
      <p className="text-[13px] text-[#D8D5CE]">
        Último servicio: {member.lastServiceAt ? `${formatStatsDate(member.lastServiceAt)} (${sinceLabel(member.lastServiceAt)})` : 'nunca'}
        {member.nextEventAt && ` · Próximo: ${formatStatsDate(member.nextEventAt)}`}
      </p>
      {member.unavailableDaysNext30 > 0 && (
        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          <CalendarOff className="h-3.5 w-3.5" /> No disponible {member.unavailableDaysNext30} {member.unavailableDaysNext30 === 1 ? 'día' : 'días'} en los próximos 30 días
        </p>
      )}
    </li>
  );
}

export function MemberLoadSection({ stats }: { stats: MemberLoadStats }) {
  const { thresholds } = stats;
  return (
    <div className="space-y-4">
      <div className="panel space-y-1.5 p-4 text-[13px] text-[#D8D5CE]">
        <p>
          <strong className="text-white">En el equipo</strong>, <strong className="text-white">confirmados</strong> y <strong className="text-white">rechazados</strong> cuentan los eventos del
          periodo que ya pasaron (sin los cancelados). <strong className="text-white">Próximos</strong>: eventos que vienen y no rechazó.
        </p>
        <p>
          <strong className="text-white">Sobrecargado</strong>: {thresholds.overloadedUpcomingEvents} o más eventos en los próximos {thresholds.overloadedWindowDays} días.{' '}
          <strong className="text-white">Sin servicio hace tiempo</strong>: no estuvo en ningún evento hecho (confirmado o terminado) en los últimos {thresholds.idleDays} días.
        </p>
      </div>
      {stats.members.length === 0 ? (
        <p className="text-sm text-muted">No hay miembros activos.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {stats.members.map((member) => (
            <MemberCard key={member.membershipId} member={member} />
          ))}
        </ul>
      )}
    </div>
  );
}
