import { useState, type FormEvent } from 'react';
import type { Appointment, AppointmentInput, AppointmentKind } from '../types/appointment';
import type { Treatment } from '../types/treatment';
import { KIND_LABELS } from '../utils/appointments';

interface Props {
  initial?: Appointment;
  treatments: Treatment[];
  onSubmit: (data: AppointmentInput) => Promise<void>;
  onCancel: () => void;
}

const SPECIALTY_SUGGESTIONS = [
  'Medicina de familia',
  'Dermatología',
  'Endocrinología',
  'Cardiología',
  'Digestivo',
  'Neurología',
  'Psiquiatría',
  'Ginecología',
  'Urología',
  'Oftalmología',
  'Traumatología',
];

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200';
const labelClass = 'block space-y-1 text-sm font-medium text-gray-700';
const optional = <span className="font-normal text-gray-400">(opcional)</span>;

export function AppointmentForm({ initial, treatments, onSubmit, onCancel }: Props) {
  const [kind, setKind] = useState<AppointmentKind>(initial?.kind ?? 'labTest');
  const [specialty, setSpecialty] = useState(initial?.specialty ?? '');
  const [doctor, setDoctor] = useState(initial?.doctor ?? '');
  const [date, setDate] = useState(initial?.date ?? '');
  const [time, setTime] = useState(initial?.time ?? '');
  const [place, setPlace] = useState(initial?.place ?? '');
  const [treatmentId, setTreatmentId] = useState(initial?.treatmentId ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectableTreatments = treatments.filter((t) => !t.archived || t.id === initial?.treatmentId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        kind,
        specialty: specialty.trim() || undefined,
        doctor: doctor.trim() || undefined,
        date: date || undefined,
        time: date && time ? time : undefined,
        place: place.trim() || undefined,
        treatmentId: treatmentId || undefined,
        notes: notes.trim() || undefined,
        done: initial?.done ?? false,
      });
    } catch {
      setError('No se pudo guardar la cita.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200/80 bg-white/30 p-4">
      <h3 className="font-semibold">{initial ? 'Editar cita' : 'Nueva cita'}</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          <span>Tipo</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as AppointmentKind)} className={inputClass}>
            {(Object.keys(KIND_LABELS) as AppointmentKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span>Especialidad {optional}</span>
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            list="specialty-suggestions"
            className={inputClass}
            placeholder="Dermatología"
          />
          <datalist id="specialty-suggestions">
            {SPECIALTY_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          <span>Médico {optional}</span>
          <input value={doctor} onChange={(e) => setDoctor(e.target.value)} className={inputClass} placeholder="Dra. García" />
        </label>
        <label className={labelClass}>
          <span>Lugar {optional}</span>
          <input value={place} onChange={(e) => setPlace(e.target.value)} className={inputClass} placeholder="Centro de salud" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          <span>Fecha <span className="font-normal text-gray-400">(vacío = pendiente de pedir cita)</span></span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </label>
        <label className={labelClass}>
          <span>Hora {optional}</span>
          <input type="time" value={time} disabled={!date} onChange={(e) => setTime(e.target.value)} className={`${inputClass} disabled:opacity-50`} />
        </label>
      </div>

      {selectableTreatments.length > 0 && (
        <label className={labelClass}>
          <span>Tratamiento relacionado {optional}</span>
          <select value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)} className={inputClass}>
            <option value="">Ninguno</option>
            {selectableTreatments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className={labelClass}>
        <span>Notas {optional}</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="Ir en ayunas. Después, pedir cita con el dermatólogo."
        />
      </label>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
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
