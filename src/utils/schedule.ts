import type { DaySlot, DayState, Frequency, Intake, Treatment } from '../types/treatment';
import { daysBetween, weekdayOf } from './dates';
import { intakeId } from './intakeStore';

export const WEEKDAY_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const WEEKDAYS_MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_NAMES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const NO_TIME = '99:99';

export function isDueOn(treatment: Treatment, dateKey: string): boolean {
  if (dateKey < treatment.startDate) return false;
  if (treatment.endDate && dateKey > treatment.endDate) return false;
  const { frequency } = treatment;
  switch (frequency.kind) {
    case 'daily':
      return true;
    case 'intervalDays':
      return daysBetween(treatment.startDate, dateKey) % Math.max(1, frequency.intervalDays ?? 1) === 0;
    case 'weekdays':
      return (frequency.weekdays ?? []).includes(weekdayOf(dateKey));
  }
}

export function buildDaySlots(treatments: Treatment[], intakes: Intake[], dateKey: string): DaySlot[] {
  const byId = new Map(intakes.filter((i) => i.date === dateKey).map((i) => [i.id, i]));
  const slots: DaySlot[] = [];
  for (const treatment of treatments) {
    if (!isDueOn(treatment, dateKey)) continue;
    for (let slot = 0; slot < treatment.frequency.timesPerDay; slot++) {
      slots.push({
        treatment,
        slot,
        time: treatment.frequency.times?.[slot] || undefined,
        intake: byId.get(intakeId(treatment.id, dateKey, slot)),
      });
    }
  }
  return slots.sort((a, b) => (a.time ?? NO_TIME).localeCompare(b.time ?? NO_TIME));
}

export function dayState(slots: DaySlot[], dateKey: string, todayKey: string): DayState {
  if (dateKey > todayKey) return 'future';
  if (slots.length === 0) return 'notDue';
  const taken = slots.filter((s) => s.intake).length;
  if (taken === slots.length) return 'complete';
  if (taken > 0) return 'partial';
  return dateKey === todayKey ? 'future' : 'missed';
}

export function frequencyLabel(frequency: Frequency): string {
  const times = frequency.timesPerDay === 1 ? '1 vez' : `${frequency.timesPerDay} veces`;
  switch (frequency.kind) {
    case 'daily':
      return `${times} al día`;
    case 'intervalDays':
      return `${times} cada ${frequency.intervalDays ?? 1} días`;
    case 'weekdays': {
      const days = WEEKDAYS_MONDAY_FIRST.filter((d) => frequency.weekdays?.includes(d))
        .map((d) => WEEKDAY_NAMES[d])
        .join(', ');
      return `${times} al día · ${days}`;
    }
  }
}
