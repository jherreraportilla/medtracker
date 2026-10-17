const STORAGE_KEY = 'medtracker-bg-color';

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
