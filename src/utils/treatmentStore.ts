import type { Treatment, TreatmentInput } from '../types/treatment';
import { newId, withDb } from './pillDb';

export function listTreatments(): Promise<Treatment[]> {
  return withDb((db) => db.getAllFromIndex('treatments', 'by-createdAt'));
}

async function putTreatment(treatment: Treatment): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction('treatments', 'readwrite', { durability: 'strict' });
    await Promise.all([tx.store.put(treatment), tx.done]);
  });
}

export async function saveTreatment(data: TreatmentInput): Promise<Treatment> {
  const treatment: Treatment = { ...data, id: newId(), createdAt: Date.now() };
  await putTreatment(treatment);
  return treatment;
}

export function updateTreatment(treatment: Treatment): Promise<void> {
  return putTreatment(treatment);
}

export async function deleteTreatment(id: string): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction(['treatments', 'intakes'], 'readwrite', { durability: 'strict' });
    const intakes = tx.objectStore('intakes');
    const intakeKeys = await intakes.index('by-treatment').getAllKeys(id);
    await Promise.all([
      tx.objectStore('treatments').delete(id),
      ...intakeKeys.map((key) => intakes.delete(key)),
      tx.done,
    ]);
  });
}
