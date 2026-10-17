import type { Treatment, TreatmentInput } from '../types/treatment';
import { getDb, newId } from './pillDb';

export async function listTreatments(): Promise<Treatment[]> {
  const db = await getDb();
  return db.getAllFromIndex('treatments', 'by-createdAt');
}

export async function saveTreatment(data: TreatmentInput): Promise<Treatment> {
  const treatment: Treatment = { ...data, id: newId(), createdAt: Date.now() };
  const db = await getDb();
  await db.put('treatments', treatment);
  return treatment;
}

export async function updateTreatment(treatment: Treatment): Promise<void> {
  const db = await getDb();
  await db.put('treatments', treatment);
}

export async function deleteTreatment(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['treatments', 'intakes'], 'readwrite');
  const intakes = tx.objectStore('intakes');
  const intakeKeys = await intakes.index('by-treatment').getAllKeys(id);
  await Promise.all([
    tx.objectStore('treatments').delete(id),
    ...intakeKeys.map((key) => intakes.delete(key)),
    tx.done,
  ]);
}
