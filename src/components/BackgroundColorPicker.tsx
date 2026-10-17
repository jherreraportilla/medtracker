import { useEffect, useRef, useState } from 'react';
import { getBackgroundContrast } from '../utils/contrast';

interface Props {
  value: string;
  onChange: (color: string) => void;
  onPreview?: (color: string) => void;
  onPreviewEnd?: () => void;
  hasImage: boolean;
  onImageSelect: (file: File) => Promise<void> | void;
  onImageRemove: () => void;
}

const PALETTE = [
  '#f9fafb',
  '#e5e7eb',
  '#ecfdf5',
  '#d1fae5',
  '#065f46',
  '#064e3b',
  '#1e293b',
  '#111827',
];

export function BackgroundColorPicker({
  value,
  onChange,
  onPreview,
  onPreviewEnd,
  hasImage,
  onImageSelect,
  onImageRemove,
}: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImageFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('El archivo debe ser una imagen.');
      return;
    }
    setImageError(null);
    try {
      await onImageSelect(file);
    } catch {
      setImageError('No se pudo aplicar la imagen.');
    }
  }

  function endPreview() {
    setHovered(null);
    onPreviewEnd?.();
  }

  function close() {
    setOpen(false);
    endPreview();
  }

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function preview(color: string) {
    setHovered(color);
    onPreview?.(color);
  }

  function select(color: string) {
    onChange(color);
    close();
  }

  const candidate = hovered ?? value;
  const contrast = getBackgroundContrast(candidate);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-400 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
      >
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-gray-300"
          style={{ backgroundColor: value }}
          aria-hidden="true"
        />
        <span>Color de fondo</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Selector de color de fondo"
          className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 text-gray-900 shadow-lg"
        >
          <p className="mb-2 text-xs font-medium text-gray-700">Color de fondo</p>

          <div className="grid grid-cols-8 gap-1.5">
            {PALETTE.map((color) => {
              const selected = color.toLowerCase() === value.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => select(color)}
                  onMouseEnter={() => preview(color)}
                  onMouseLeave={endPreview}
                  aria-label={`Usar color ${color}`}
                  className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 ${
                    selected ? 'border-emerald-500 ring-2 ring-emerald-300' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              );
            })}
          </div>

          <label className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-600">
            <span>Personalizado</span>
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onInput={(e) => preview((e.target as HTMLInputElement).value)}
              className="h-7 w-12 cursor-pointer rounded border border-gray-300 bg-white p-0"
            />
          </label>

          <div
            className="mt-3 rounded-lg border border-gray-200 p-3 text-center text-sm"
            style={{ backgroundColor: candidate, color: contrast.textColor }}
          >
            Texto de ejemplo
          </div>

          {contrast.isLow && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
              <span title="Contraste bajo, puede dificultar la lectura">
                Contraste bajo, puede dificultar la lectura.
              </span>
            </p>
          )}

          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="mb-2 text-xs font-medium text-gray-700">Imagen de fondo</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleImageFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900"
              >
                {hasImage ? 'Cambiar imagen' : 'Subir imagen'}
              </button>
              {hasImage && (
                <button
                  type="button"
                  onClick={() => {
                    setImageError(null);
                    onImageRemove();
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Quitar
                </button>
              )}
            </div>
            {imageError && <p className="mt-2 text-[11px] text-red-600">{imageError}</p>}
            <p className="mt-2 text-[11px] text-gray-500">
              Se guarda solo en este dispositivo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
