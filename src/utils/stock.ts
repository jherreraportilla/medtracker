import type { Intake, Stock, Treatment } from '../types/treatment';

export function pillsPerBox(stock: Pick<Stock, 'pillsPerBlister' | 'blistersPerBox'>): number {
  return stock.pillsPerBlister * stock.blistersPerBox;
}

export function remainingPills(treatment: Treatment, intakes: Intake[]): number | null {
  const { stock } = treatment;
  if (!stock) return null;
  const consumed = intakes.filter(
    (i) => i.treatmentId === treatment.id && !i.backfilled && i.takenAt >= stock.countedAt
  ).length;
  return Math.max(0, roundPills(stock.pills - consumed * stock.pillsPerIntake));
}

export function roundPills(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isLowStock(treatment: Treatment, remaining: number | null): boolean {
  return !treatment.archived && treatment.stock !== undefined && remaining !== null && remaining <= treatment.stock.alertAt;
}

export function pillsPerDay(treatment: Treatment): number {
  const { frequency, stock } = treatment;
  if (!stock) return 0;
  const perActiveDay = frequency.timesPerDay * stock.pillsPerIntake;
  switch (frequency.kind) {
    case 'daily':
      return perActiveDay;
    case 'intervalDays':
      return perActiveDay / Math.max(1, frequency.intervalDays ?? 1);
    case 'weekdays':
      return (perActiveDay * (frequency.weekdays?.length ?? 0)) / 7;
  }
}

export function daysLeft(treatment: Treatment, remaining: number): number | null {
  const perDay = pillsPerDay(treatment);
  return perDay > 0 ? Math.floor(remaining / perDay) : null;
}

export function blisterBreakdown(pillsPerBlister: number, remaining: number): string {
  const full = Math.floor(remaining / pillsPerBlister);
  const loose = roundPills(remaining - full * pillsPerBlister);
  const parts = [
    full > 0 ? `${full} ${full === 1 ? 'tableta' : 'tabletas'}` : null,
    loose > 0 ? `${formatPills(loose)} sueltas` : null,
  ].filter(Boolean);
  return parts.join(' y ');
}

export function formatPills(n: number): string {
  return n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}
