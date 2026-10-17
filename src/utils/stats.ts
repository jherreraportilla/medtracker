import type { Intake, Treatment, TreatmentProgress } from '../types/treatment';
import { addDays, daysBetween } from './dates';
import { isDueOn } from './schedule';

export function treatmentProgress(
  treatment: Treatment,
  intakes: Intake[],
  todayKey: string
): TreatmentProgress {
  const { startDate, endDate } = treatment;
  const { timesPerDay } = treatment.frequency;
  const lastKey = endDate && endDate < todayKey ? endDate : todayKey;

  const takenByDate = new Map<string, number>();
  for (const intake of intakes) {
    if (intake.treatmentId !== treatment.id || intake.slot >= timesPerDay) continue;
    takenByDate.set(intake.date, (takenByDate.get(intake.date) ?? 0) + 1);
  }

  let expectedIntakes = 0;
  let takenIntakes = 0;
  let runningStreak = 0;
  let longestStreak = 0;

  for (let key = startDate; key <= lastKey; key = addDays(key, 1)) {
    if (!isDueOn(treatment, key)) continue;
    const taken = takenByDate.get(key) ?? 0;
    expectedIntakes += timesPerDay;
    takenIntakes += taken;

    if (taken >= timesPerDay) {
      runningStreak++;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else if (key !== todayKey) {
      runningStreak = 0;
    }
  }

  return {
    dayNumber: Math.max(0, daysBetween(startDate, lastKey) + 1),
    totalDays: endDate ? daysBetween(startDate, endDate) + 1 : undefined,
    expectedIntakes,
    takenIntakes,
    adherence: expectedIntakes > 0 ? takenIntakes / expectedIntakes : 0,
    currentStreak: runningStreak,
    longestStreak,
  };
}
