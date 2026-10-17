import type { Intake } from '../types/treatment';
import { getDb } from './pillDb';

export function intakeId(treatmentId: string, date: string, slot: number): string {
  return `${treatmentId}|${date}|${slot}`;
}

export async function listIntakes(): Promise<Intake[]> {
  const db = await getDb();
  return db.getAllFromIndex('intakes', 'by-date');
}

export async function markIntake(treatmentId: string, date: string, slot: number): Promise<Intake> {
  const intake: Intake = {
    id: intakeId(treatmentId, date, slot),
    treatmentId,
    date,
    slot,
    takenAt: Date.now(),
  };
  const db = await getDb();
  await db.put('intakes', intake);
  return intake;
}

export async function unmarkIntake(treatmentId: string, date: string, slot: number): Promise<void> {
  const db = await getDb();
  await db.delete('intakes', intakeId(treatmentId, date, slot));
}
