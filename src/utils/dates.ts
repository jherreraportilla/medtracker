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
