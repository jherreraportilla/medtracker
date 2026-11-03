function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromLocalDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = fromLocalDateKey(key);
  d.setDate(d.getDate() + n);
  return toLocalDateKey(d);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export function weekdayOf(key: string): number {
  return fromLocalDateKey(key).getDay();
}

export function toMonthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function addMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysOfMonth(monthKey: string): string[] {
  const [y, m] = monthKey.split('-').map(Number);
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => `${monthKey}-${pad(i + 1)}`);
}

export function formatDateKey(key: string, options: Intl.DateTimeFormatOptions): string {
  return fromLocalDateKey(key).toLocaleString('es-ES', options);
}

export interface Duration {
  months: number;
  days: number;
  totalDays: number;
}

function addMonthsClamped(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const lastDay = new Date(y, m - 1 + n + 1, 0).getDate();
  return toLocalDateKey(new Date(y, m - 1 + n, Math.min(d, lastDay)));
}

export function durationBetween(fromKey: string, toKey: string): Duration {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months--;
  months = Math.max(0, months);
  return {
    months,
    days: daysBetween(addMonthsClamped(fromKey, months), toKey),
    totalDays: daysBetween(fromKey, toKey),
  };
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

export function formatDuration({ months, days, totalDays }: Duration): string {
  if (months === 0) return plural(totalDays, 'día', 'días');
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  const parts = [
    years > 0 ? plural(years, 'año', 'años') : null,
    restMonths > 0 ? plural(restMonths, 'mes', 'meses') : null,
    days > 0 ? plural(days, 'día', 'días') : null,
  ].filter(Boolean) as string[];
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}` : parts[0];
  return `${text} (${plural(totalDays, 'día', 'días')})`;
}
