import type { Intake } from '../types/treatment';
import { withDb } from './pillDb';

export function intakeId(treatmentId: string, date: string, slot: number): string {
  return `${treatmentId}|${date}|${slot}`;
}

export function listIntakes(): Promise<Intake[]> {
  return withDb((db) => db.getAllFromIndex('intakes', 'by-date'));
}

export async function markIntake(treatmentId: string, date: string, slot: number): Promise<Intake> {
  const intake: Intake = {
    id: intakeId(treatmentId, date, slot),
    treatmentId,
    date,
    slot,
    takenAt: Date.now(),
  };
  await withDb(async (db) => {
    const tx = db.transaction('intakes', 'readwrite', { durability: 'strict' });
    await Promise.all([tx.store.put(intake), tx.done]);
  });
  return intake;
}

export async function unmarkIntake(treatmentId: string, date: string, slot: number): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction('intakes', 'readwrite', { durability: 'strict' });
    await Promise.all([tx.store.delete(intakeId(treatmentId, date, slot)), tx.done]);
  });
}
