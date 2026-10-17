import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Intake, Treatment } from '../types/treatment';

interface PillDB extends DBSchema {
  treatments: {
    key: string;
    value: Treatment;
    indexes: { 'by-createdAt': number };
  };
  intakes: {
    key: string;
    value: Intake;
    indexes: { 'by-date': string; 'by-treatment': string };
  };
}

const DB_NAME = 'pill-tracker';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PillDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<PillDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PillDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const treatments = db.createObjectStore('treatments', { keyPath: 'id' });
        treatments.createIndex('by-createdAt', 'createdAt');
        const intakes = db.createObjectStore('intakes', { keyPath: 'id' });
        intakes.createIndex('by-date', 'date');
        intakes.createIndex('by-treatment', 'treatmentId');
      },
    });
  }
  return dbPromise;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
