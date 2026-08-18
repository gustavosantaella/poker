export interface CalendarDay {
  date: Date;
  /** Clave local YYYY-MM-DD. */
  key: string;
  /** Pertenece al mes que se está mostrando. */
  inMonth: boolean;
  isToday: boolean;
}

/** Clave local (sin zona horaria) para agrupar eventos por día. */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Devuelve 42 celdas (6 semanas) que contienen el mes indicado.
 * weekStartsOn: 0 = domingo, 1 = lunes.
 */
export function getMonthGrid(year: number, month: number, weekStartsOn: 0 | 1 = 1): CalendarDay[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const gridStart = new Date(year, month, 1 - offset);
  const todayKey = dateKey(startOfToday());
  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    days.push({
      date,
      key: dateKey(date),
      inMonth: date.getMonth() === month,
      isToday: dateKey(date) === todayKey,
    });
  }
  return days;
}

/** "septiembre 2026" en el locale indicado. */
export function formatMonthLabel(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1),
  );
}

/** "lunes, 14 de septiembre" en el locale indicado. */
export function formatDayLabel(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

/** "14:30" en el locale indicado. */
export function formatEventTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}

/** Etiquetas cortas de los días de la semana según el inicio de semana. */
export function getWeekdayLabels(locale: string, weekStartsOn: 0 | 1 = 1): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const start = weekStartsOn === 1 ? 1 : 7; // enero 2024: el día 1 fue lunes
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    labels.push(fmt.format(new Date(2024, 0, start + i)));
  }
  return labels;
}
