import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface ThemeDB extends DBSchema {
  background: {
    key: string;
    value: Blob;
  };
}

const DB_NAME = 'medtracker-theme';
const DB_VERSION = 1;
const STORE = 'background';
const KEY = 'current';

const MAX_SIDE = 2048;
const JPEG_QUALITY = 0.82;

let dbPromise: Promise<IDBPDatabase<ThemeDB>> | null = null;

function getDb(): Promise<IDBPDatabase<ThemeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ThemeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const longSide = Math.max(bitmap.width, bitmap.height);
  const scale = longSide > MAX_SIDE ? MAX_SIDE / longSide : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('No se pudo crear el canvas para la imagen de fondo');
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Fallo al procesar la imagen de fondo'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}

export async function saveBgImage(file: File): Promise<Blob> {
  const blob = await downscale(file);
  const db = await getDb();
  await db.put(STORE, blob, KEY);
  return blob;
}

export async function loadBgImage(): Promise<Blob | null> {
  try {
    const db = await getDb();
    return (await db.get(STORE, KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function clearBgImage(): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, KEY);
}
