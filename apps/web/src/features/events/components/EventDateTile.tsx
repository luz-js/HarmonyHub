/** Bloque de fecha: dia de la semana (solo en `lg`), dia del mes en ambar y mes abreviado. */
export function EventDateTile({ startsAt, size = 'md' }: { startsAt: string; size?: 'md' | 'lg' }) {
  const date = new Date(startsAt);
  const month = date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  if (size === 'lg') {
    const weekday = date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
    return (
      <div className="date-block h-[92px] w-[84px] gap-0.5 rounded-[14px] text-xs">
        <span>{weekday}</span>
        <strong className="text-[38px]">{date.getDate()}</strong>
        <span>{month}</span>
      </div>
    );
  }
  return (
    <div className="date-block h-14 w-[52px] rounded-[10px]">
      <strong className="text-[22px]">{date.getDate()}</strong>
      <span className="mt-1">{month}</span>
    </div>
  );
}
