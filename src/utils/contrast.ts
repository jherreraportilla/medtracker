export interface Rgb {
  r: number;
  g: number;
  b: number;
}

// Fixed app text colors (Tailwind gray-50 / gray-900).
export const TEXT_LIGHT = '#f9fafb';
export const TEXT_DARK = '#111827';

const AA_CONTRAST_RATIO = 4.5;

export function hexToRgb(hex: string): Rgb {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const value = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(value)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

export function mixHex(top: string, bottom: string, topWeight: number): string {
  const a = hexToRgb(top);
  const b = hexToRgb(bottom);
  const w = Math.min(1, Math.max(0, topWeight));
  return rgbToHex({
    r: a.r * w + b.r * (1 - w),
    g: a.g * w + b.g * (1 - w),
    b: a.b * w + b.b * (1 - w),
  });
}

function gammaChannel(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * gammaChannel(r) + 0.7152 * gammaChannel(g) + 0.0722 * gammaChannel(b);
}

export function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const TEXT_LIGHT_LUMINANCE = getRelativeLuminance(249, 250, 251);
const TEXT_DARK_LUMINANCE = getRelativeLuminance(17, 24, 39);

// Picks the text shade (light vs dark) that yields the higher WCAG contrast
// against the given background. A dark background ends up with light text and
// vice versa, while always favouring the better-contrasting option.
export function getTextColorForBackground(hex: string): 'light' | 'dark' {
  const { r, g, b } = hexToRgb(hex);
  const bgLuminance = getRelativeLuminance(r, g, b);
  const lightContrast = getContrastRatio(bgLuminance, TEXT_LIGHT_LUMINANCE);
  const darkContrast = getContrastRatio(bgLuminance, TEXT_DARK_LUMINANCE);
  return lightContrast >= darkContrast ? 'light' : 'dark';
}

export function resolveTextColor(hex: string): string {
  return getTextColorForBackground(hex) === 'light' ? TEXT_LIGHT : TEXT_DARK;
}

export interface BackgroundContrast {
  mode: 'light' | 'dark';
  textColor: string;
  ratio: number;
  isLow: boolean;
}

export function getBackgroundContrast(hex: string): BackgroundContrast {
  const { r, g, b } = hexToRgb(hex);
  const bgLuminance = getRelativeLuminance(r, g, b);
  const mode = getTextColorForBackground(hex);
  const textColor = mode === 'light' ? TEXT_LIGHT : TEXT_DARK;
  const textLuminance = mode === 'light' ? TEXT_LIGHT_LUMINANCE : TEXT_DARK_LUMINANCE;
  const ratio = getContrastRatio(bgLuminance, textLuminance);
  return { mode, textColor, ratio, isLow: ratio < AA_CONTRAST_RATIO };
}
