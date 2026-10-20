import { describe, expect, it } from 'vitest';
import { buildMonthGrid, formatMonthLabel, getGridRange, groupEventsByDay, shiftMonth } from './calendar.utils';

describe('calendar utils', () => {
  it('arma semanas completas de lunes a domingo para el mes', () => {
    // Octubre 2026 empieza en jueves y tiene 31 dias: 3 dias de septiembre + 31 + 1 de noviembre = 35 celdas.
    const days = buildMonthGrid({ year: 2026, month: 9 }, new Date(2026, 9, 17));
    expect(days).toHaveLength(35);
    expect(days[0].key).toBe('2026-09-28');
    expect(days[0].inMonth).toBe(false);
    expect(days[3].key).toBe('2026-10-01');
    expect(days[3].inMonth).toBe(true);
    expect(days[days.length - 1].key).toBe('2026-11-01');
    expect(days.filter((day) => day.isToday).map((day) => day.key)).toEqual(['2026-10-17']);
  });

  it('usa 6 semanas cuando el mes lo necesita', () => {
    // Agosto 2026 empieza en sabado: 5 dias previos + 31 = 36 -> 42 celdas.
    expect(buildMonthGrid({ year: 2026, month: 7 })).toHaveLength(42);
  });

  it('getGridRange cubre desde el inicio del primer dia hasta el final del ultimo', () => {
    const range = getGridRange(buildMonthGrid({ year: 2026, month: 9 }));
    expect(new Date(range.from).getDate()).toBe(28);
    expect(new Date(range.from).getHours()).toBe(0);
    expect(new Date(range.to).getDate()).toBe(1);
    expect(new Date(range.to).getHours()).toBe(23);
  });

  it('shiftMonth cruza el cambio de año', () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(formatMonthLabel({ year: 2026, month: 9 }).toLowerCase()).toContain('octubre');
  });

  it('groupEventsByDay agrupa por dia local', () => {
    const morning = { id: 'a', startsAt: new Date(2026, 9, 18, 9, 0).toISOString() };
    const evening = { id: 'b', startsAt: new Date(2026, 9, 18, 19, 0).toISOString() };
    const other = { id: 'c', startsAt: new Date(2026, 9, 20, 19, 0).toISOString() };
    const groups = groupEventsByDay([morning, evening, other]);
    expect(groups['2026-10-18'].map((event) => event.id)).toEqual(['a', 'b']);
    expect(groups['2026-10-20'].map((event) => event.id)).toEqual(['c']);
  });
});
