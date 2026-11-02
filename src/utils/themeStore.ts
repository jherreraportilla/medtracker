const STORAGE_KEY = 'medtracker-bg-color';
const GLASS_KEY = 'medtracker-glass-transparency';

export const DEFAULT_GLASS_TRANSPARENCY = 45;
export const MAX_GLASS_TRANSPARENCY = 90;

export function getStoredGlassTransparency(): number {
  try {
    const value = Number(localStorage.getItem(GLASS_KEY));
    return localStorage.getItem(GLASS_KEY) !== null && Number.isFinite(value)
      ? Math.min(MAX_GLASS_TRANSPARENCY, Math.max(0, value))
      : DEFAULT_GLASS_TRANSPARENCY;
  } catch {
    return DEFAULT_GLASS_TRANSPARENCY;
  }
}

export function setStoredGlassTransparency(value: number): void {
  try {
    localStorage.setItem(GLASS_KEY, String(value));
  } catch {
    // Safari en modo privado puede bloquear localStorage; ignoramos el fallo.
  }
}

// Tailwind gray-50, the current app background.
export const DEFAULT_BG_COLOR = '#f9fafb';

export function getStoredBgColor(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_BG_COLOR;
  } catch {
    return DEFAULT_BG_COLOR;
  }
}

export function setStoredBgColor(color: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, color);
  } catch {
    // Safari en modo privado puede bloquear localStorage; ignoramos el fallo.
  }
}
