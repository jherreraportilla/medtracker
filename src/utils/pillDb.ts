import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Appointment } from '../types/appointment';
import type { Intake, Treatment } from '../types/treatment';

export interface PillDB extends DBSchema {
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
  appointments: {
    key: string;
    value: Appointment;
    indexes: { 'by-createdAt': number };
  };
}

const DB_NAME = 'pill-tracker';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<PillDB>> | null = null;

function resetDb() {
  dbPromise = null;
}

export function getDb(): Promise<IDBPDatabase<PillDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PillDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const treatments = db.createObjectStore('treatments', { keyPath: 'id' });
          treatments.createIndex('by-createdAt', 'createdAt');
          const intakes = db.createObjectStore('intakes', { keyPath: 'id' });
          intakes.createIndex('by-date', 'date');
          intakes.createIndex('by-treatment', 'treatmentId');
        }
        if (oldVersion < 2) {
          const appointments = db.createObjectStore('appointments', { keyPath: 'id' });
          appointments.createIndex('by-createdAt', 'createdAt');
        }
      },
      blocking() {
        dbPromise?.then((db) => db.close());
        resetDb();
      },
      terminated: resetDb,
    }).then((db) => {
      db.addEventListener('close', resetDb);
      return db;
    });
    dbPromise.catch(resetDb);
  }
  return dbPromise;
}

// iOS Safari drops the IndexedDB connection when a PWA is suspended in background;
// the next operation fails, so we reopen once and retry.
export async function withDb<T>(op: (db: IDBPDatabase<PillDB>) => Promise<T>): Promise<T> {
  try {
    return await op(await getDb());
  } catch {
    resetDb();
    return op(await getDb());
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
