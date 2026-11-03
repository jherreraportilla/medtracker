import { useState, type FormEvent } from 'react';
import type { FrequencyKind, Stock, Treatment, TreatmentInput } from '../types/treatment';
import { WEEKDAY_SHORT, WEEKDAYS_MONDAY_FIRST } from '../utils/schedule';
import { blisterBreakdown, formatPills, pillsPerBox, roundPills } from '../utils/stock';

interface Props {
  initial?: Treatment;
  initialRemaining?: number | null;
  todayKey: string;
  onSubmit: (data: TreatmentInput) => Promise<void> | void;
  onCancel: () => void;
}

const TREATMENT_COLORS = ['#059669', '#0284c7', '#7c3aed', '#db2777', '#d97706', '#0d9488', '#4f46e5', '#dc2626'];

const KIND_LABELS: Record<FrequencyKind, string> = {
  daily: 'Todos los días',
  intervalDays: 'Cada N días',
  weekdays: 'Días de la semana',
};

const MAX_TIMES_PER_DAY = 6;

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200';
const labelClass = 'block space-y-1 text-sm font-medium text-gray-700';
const DECIMAL_PATTERN = '[0-9]*([.,][0-9]+)?';

function parseDecimal(text: string): number {
  const normalized = text.trim().replace(',', '.');
  return normalized === '' ? Number.NaN : Number(normalized);
}

function toDecimalText(n: number): string {
  return String(n).replace('.', ',');
}

export function TreatmentForm({ initial, initialRemaining, todayKey, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [dose, setDose] = useState(initial?.dose ?? '');
  const [kind, setKind] = useState<FrequencyKind>(initial?.frequency.kind ?? 'daily');
  const [timesPerDay, setTimesPerDay] = useState(initial?.frequency.timesPerDay ?? 1);
  const [intervalDays, setIntervalDays] = useState(initial?.frequency.intervalDays ?? 2);
  const [weekdays, setWeekdays] = useState<number[]>(initial?.frequency.weekdays ?? [1, 2, 3, 4, 5]);
  const [times, setTimes] = useState<string[]>(initial?.frequency.times ?? []);
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayKey);
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [color, setColor] = useState(initial?.color ?? TREATMENT_COLORS[0]);
  const [trackStock, setTrackStock] = useState(Boolean(initial?.stock));
  const [blistersPerBox, setBlistersPerBox] = useState(initial?.stock?.blistersPerBox ?? 3);
  const [pillsPerBlister, setPillsPerBlister] = useState(initial?.stock?.pillsPerBlister ?? 10);
  const [pillsPerIntakeText, setPillsPerIntakeText] = useState(toDecimalText(initial?.stock?.pillsPerIntake ?? 1));
  const [alertAt, setAlertAt] = useState(initial?.stock?.alertAt ?? 5);
  const [pillsNowText, setPillsNowText] = useState(toDecimalText(initialRemaining ?? 0));
  const pillsPerIntake = parseDecimal(pillsPerIntakeText);
  const pillsNow = parseDecimal(pillsNowText);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleWeekday(day: number) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function setTime(index: number, value: string) {
    setTimes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function buildStock(): Stock {
    const previous = initial?.stock;
    const keepCount = previous !== undefined && pillsNow === initialRemaining;
    return {
      blistersPerBox,
      pillsPerBlister,
      pillsPerIntake,
      alertAt,
      pills: keepCount ? previous.pills : pillsNow,
      countedAt: keepCount ? previous.countedAt : Date.now(),
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Indica el nombre del medicamento.');
    if (!startDate) return setError('Indica la fecha de inicio.');
    if (endDate && endDate < startDate) return setError('La fecha de fin no puede ser anterior a la de inicio.');
    if (kind === 'weekdays' && weekdays.length === 0) return setError('Elige al menos un día de la semana.');
    if (kind === 'intervalDays' && intervalDays < 2) return setError('El intervalo debe ser de al menos 2 días.');
    if (trackStock) {
      if (!Number.isInteger(blistersPerBox) || blistersPerBox < 1 || !Number.isInteger(pillsPerBlister) || pillsPerBlister < 1) {
        return setError('Las tabletas por caja y las pastillas por tableta deben ser números enteros mayores que 0.');
      }
      if (!(pillsPerIntake > 0)) return setError('Las pastillas por toma deben ser mayores que 0.');
      if (!(alertAt >= 0) || !(pillsNow >= 0)) return setError('Las cantidades de pastillas no pueden ser negativas.');
    }

    const slotTimes = times.slice(0, timesPerDay);
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        dose: dose.trim() || undefined,
        frequency: {
          kind,
          timesPerDay,
          intervalDays: kind === 'intervalDays' ? intervalDays : undefined,
          weekdays: kind === 'weekdays' ? weekdays : undefined,
          times: slotTimes.some(Boolean) ? Array.from({ length: timesPerDay }, (_, i) => slotTimes[i] ?? '') : undefined,
        },
        startDate,
        endDate: endDate || undefined,
        notes: notes.trim() || undefined,
        color,
        stock: trackStock ? buildStock() : undefined,
        archived: initial?.archived ?? false,
      });
    } catch {
      setError('No se pudo guardar el tratamiento.');
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 glass-card rounded-xl p-5 text-gray-900"
    >
      <h2 className="text-lg font-semibold">{initial ? 'Editar tratamiento' : 'Nuevo tratamiento'}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          <span>Medicamento</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ibuprofeno" autoFocus />
        </label>
        <label className={labelClass}>
          <span>Dosis <span className="font-normal text-gray-400">(opcional)</span></span>
          <input value={dose} onChange={(e) => setDose(e.target.value)} className={inputClass} placeholder="600 mg" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          <span>Frecuencia</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as FrequencyKind)} className={inputClass}>
            {(Object.keys(KIND_LABELS) as FrequencyKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span>Tomas por día</span>
          <select value={timesPerDay} onChange={(e) => setTimesPerDay(Number(e.target.value))} className={inputClass}>
            {Array.from({ length: MAX_TIMES_PER_DAY }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {kind === 'intervalDays' && (
        <label className={labelClass}>
          <span>Cada cuántos días</span>
          <input
            type="number"
            min={2}
            value={intervalDays}
            onChange={(e) => setIntervalDays(Number(e.target.value))}
            className={inputClass}
          />
        </label>
      )}

      {kind === 'weekdays' && (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium text-gray-700">Días</legend>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS_MONDAY_FIRST.map((d) => {
              const active = weekdays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleWeekday(d)}
                  aria-pressed={active}
                  className={`h-9 w-9 rounded-full border text-sm font-medium ${
                    active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  {WEEKDAY_SHORT[d]}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium text-gray-700">
          Horas <span className="font-normal text-gray-400">(opcional)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: timesPerDay }, (_, i) => (
            <input
              key={i}
              type="time"
              value={times[i] ?? ''}
              onChange={(e) => setTime(i, e.target.value)}
              aria-label={`Hora de la toma ${i + 1}`}
              className={`${inputClass} w-32`}
            />
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          <span>Inicio</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </label>
        <label className={labelClass}>
          <span>Fin <span className="font-normal text-gray-400">(vacío = sin fecha de fin)</span></span>
          <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </label>
      </div>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium text-gray-700">Color</legend>
        <div className="flex flex-wrap gap-2">
          {TREATMENT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              aria-pressed={c === color}
              className={`h-7 w-7 rounded-full border-2 ${c === color ? 'border-gray-900' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-gray-200/80 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={trackStock}
            onChange={(e) => setTrackStock(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-emerald-600"
          />
          Controlar existencias y avisar para comprar
        </label>

        {trackStock && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                <span>Tabletas por caja</span>
                <input type="number" min={1} step={1} inputMode="numeric" value={blistersPerBox} onChange={(e) => setBlistersPerBox(Number(e.target.value))} className={inputClass} />
              </label>
              <label className={labelClass}>
                <span>Pastillas por tableta</span>
                <input type="number" min={1} step={1} inputMode="numeric" value={pillsPerBlister} onChange={(e) => setPillsPerBlister(Number(e.target.value))} className={inputClass} />
              </label>
              <label className={labelClass}>
                <span>Pastillas por toma</span>
                <input type="text" inputMode="decimal" pattern={DECIMAL_PATTERN} value={pillsPerIntakeText} onChange={(e) => setPillsPerIntakeText(e.target.value)} className={inputClass} />
              </label>
              <label className={labelClass}>
                <span>Avisar cuando queden</span>
                <input type="number" min={0} step={1} inputMode="numeric" value={alertAt} onChange={(e) => setAlertAt(Number(e.target.value))} className={inputClass} />
              </label>
            </div>

            <div className="space-y-1">
              <label className={labelClass}>
                <span>Pastillas disponibles ahora</span>
                <div className="flex gap-2">
                  <input type="text" inputMode="decimal" pattern={DECIMAL_PATTERN} value={pillsNowText} onChange={(e) => setPillsNowText(e.target.value)} className={inputClass} />
                  <button
                    type="button"
                    onClick={() =>
                      setPillsNowText(toDecimalText(roundPills((pillsNow || 0) + pillsPerBox({ blistersPerBox, pillsPerBlister }))))
                    }
                    className="shrink-0 rounded-lg border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    +1 caja
                  </button>
                </div>
              </label>
              <p className="text-xs text-gray-500">
                Una caja son {formatPills(pillsPerBox({ blistersPerBox, pillsPerBlister }))} pastillas.
                {pillsNow > 0 && pillsPerBlister > 0 && ` Tienes ${blisterBreakdown(pillsPerBlister, pillsNow)}.`}
              </p>
            </div>
          </>
        )}
      </fieldset>

      <label className={labelClass}>
        <span>Notas <span className="font-normal text-gray-400">(opcional)</span></span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} placeholder="Con comida" />
      </label>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
