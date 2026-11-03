import { useState, type FormEvent } from 'react';
import type { Treatment } from '../types/treatment';
import { addDays, formatDateKey } from '../utils/dates';

interface Props {
  treatment: Treatment;
  todayKey: string;
  onSubmit: (fromKey: string, toKey: string) => Promise<number>;
  onClose: () => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200';

export function BackfillForm({ treatment, todayKey, onSubmit, onClose }: Props) {
  const yesterday = addDays(todayKey, -1);
  const maxKey = treatment.endDate && treatment.endDate < yesterday ? treatment.endDate : yesterday;
  const [fromKey, setFromKey] = useState(treatment.startDate < todayKey ? treatment.startDate : addDays(todayKey, -7));
  const [toKey, setToKey] = useState(maxKey);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fromKey || !toKey) return setError('Indica las dos fechas.');
    if (toKey < fromKey) return setError('La fecha final no puede ser anterior a la inicial.');
    if (toKey > maxKey) return setError('Solo se pueden añadir tomas hasta ayer; las de hoy se marcan en «Hoy».');
    setError(null);
    setSaving(true);
    try {
      const count = await onSubmit(fromKey, toKey);
      if (count === 0) {
        setError('No había tomas pendientes en ese rango.');
        setSaving(false);
        return;
      }
      onClose();
    } catch {
      setError('No se pudieron guardar las tomas.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-3">
      <p className="text-sm font-medium text-gray-900">Añadir tomas anteriores</p>
      <p className="text-xs text-gray-500">
        Se marcarán como tomadas todas las tomas previstas en ese rango que aún no estén marcadas.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1 text-sm font-medium text-gray-700">
          <span>Desde</span>
          <input type="date" value={fromKey} max={toKey} onChange={(e) => setFromKey(e.target.value)} className={inputClass} />
        </label>
        <label className="block space-y-1 text-sm font-medium text-gray-700">
          <span>Hasta</span>
          <input type="date" value={toKey} min={fromKey} max={maxKey} onChange={(e) => setToKey(e.target.value)} className={inputClass} />
        </label>
      </div>
      {fromKey && fromKey < treatment.startDate && (
        <p className="text-xs text-amber-600">
          El inicio del tratamiento pasará al{' '}
          {formatDateKey(fromKey, { day: 'numeric', month: 'long', year: 'numeric' })}.
        </p>
      )}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Marcar como tomadas'}
        </button>
      </div>
    </form>
  );
}
