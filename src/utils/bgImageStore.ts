import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { rgbToHex } from './contrast';

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

async function decodeImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function downscale(file: File): Promise<Blob> {
  const img = await decodeImage(file);
  const longSide = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longSide > MAX_SIDE ? MAX_SIDE / longSide : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el canvas para la imagen de fondo');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Fallo al procesar la imagen de fondo'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}

const SAMPLE_SIDE = 16;

export async function averageImageColor(blob: Blob): Promise<string> {
  const img = await decodeImage(blob);
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_SIDE;
  canvas.height = SAMPLE_SIDE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No se pudo analizar la imagen de fondo');
  ctx.drawImage(img, 0, 0, SAMPLE_SIDE, SAMPLE_SIDE);
  const { data } = ctx.getImageData(0, 0, SAMPLE_SIDE, SAMPLE_SIDE);
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const pixels = data.length / 4;
  return rgbToHex({ r: r / pixels, g: g / pixels, b: b / pixels });
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
