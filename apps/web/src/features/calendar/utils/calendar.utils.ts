import { toLocalDateKey } from '../../events/utils';

export type CalendarMonth = { year: number; month: number };

export type CalendarDay = {
  date: Date;
  key: string;
  inMonth: boolean;
  isToday: boolean;
};

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Semanas completas (lunes a domingo) que cubren el mes; entre 4 y 6 filas. */
export function buildMonthGrid({ year, month }: CalendarMonth, today = new Date()): CalendarDay[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const todayKey = toLocalDateKey(today);

  return Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const key = toLocalDateKey(date);
    return { date, key, inMonth: date.getMonth() === month, isToday: key === todayKey };
  });
}

/** Rango ISO [inicio del primer dia visible, fin del ultimo] para pedir los eventos de la grilla. */
export function getGridRange(days: CalendarDay[]) {
  const first = days[0].date;
  const last = days[days.length - 1].date;
  const from = new Date(first.getFullYear(), first.getMonth(), first.getDate(), 0, 0, 0, 0);
  const to = new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function shiftMonth({ year, month }: CalendarMonth, delta: number): CalendarMonth {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function currentMonth(today = new Date()): CalendarMonth {
  return { year: today.getFullYear(), month: today.getMonth() };
}

export function formatMonthLabel({ year, month }: CalendarMonth) {
  const label = new Date(year, month, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Agrupa eventos por dia local (YYYY-MM-DD), respetando el orden recibido. */
export function groupEventsByDay<T extends { startsAt: string }>(events: T[]) {
  const groups: Record<string, T[]> = {};
  for (const event of events) {
    const key = toLocalDateKey(new Date(event.startsAt));
    (groups[key] ||= []).push(event);
  }
  return groups;
}
