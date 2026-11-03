import { useState } from 'react';
import type { Appointment, AppointmentInput } from '../types/appointment';
import type { Treatment } from '../types/treatment';
import { appointmentTitle, compareAppointments, isPastAppointment, relativeDayLabel } from '../utils/appointments';
import { formatDateKey } from '../utils/dates';
import { AppointmentForm } from './AppointmentForm';

interface Props {
  appointments: Appointment[];
  treatments: Treatment[];
  todayKey: string;
  onCreate: (data: AppointmentInput) => Promise<void>;
  onUpdate: (appointment: Appointment) => Promise<void>;
  onToggleDone: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
}

export function AppointmentsPanel({ appointments, treatments, todayKey, onCreate, onUpdate, onToggleDone, onDelete }: Props) {
  const [editing, setEditing] = useState<Appointment | 'new' | null>(null);
  const [showPast, setShowPast] = useState(false);
  const sorted = [...appointments].sort(compareAppointments);
  const upcoming = sorted.filter((a) => !isPastAppointment(a, todayKey));
  const past = sorted.filter((a) => isPastAppointment(a, todayKey)).reverse();

  async function submit(data: AppointmentInput) {
    if (editing && editing !== 'new') {
      await onUpdate({ ...editing, ...data });
    } else {
      await onCreate(data);
    }
    setEditing(null);
  }

  function renderItem(a: Appointment) {
    if (editing !== 'new' && editing?.id === a.id) {
      return (
        <li key={a.id}>
          <AppointmentForm initial={a} treatments={treatments} onSubmit={submit} onCancel={() => setEditing(null)} />
        </li>
      );
    }
    const treatment = treatments.find((t) => t.id === a.treatmentId);
    return (
      <li key={a.id} className="space-y-2 rounded-lg border border-gray-200/80 bg-white/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`font-semibold text-gray-900 ${a.done ? 'line-through opacity-70' : ''}`}>{appointmentTitle(a)}</p>
            {a.doctor && <p className="text-sm text-gray-600">{a.doctor}</p>}
          </div>
          <DateBadge appointment={a} todayKey={todayKey} />
        </div>
        <div className="space-y-0.5 text-xs text-gray-500">
          {a.date && (
            <p className="first-letter:uppercase">
              {formatDateKey(a.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {a.time && ` · ${a.time}`}
            </p>
          )}
          {a.place && <p>{a.place}</p>}
          {treatment && (
            <p className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: treatment.color }} aria-hidden="true" />
              {treatment.name}
            </p>
          )}
          {a.notes && <p className="italic">{a.notes}</p>}
        </div>
        <div className="flex flex-wrap justify-end gap-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => onToggleDone(a)}
            className="rounded-md px-2 py-1 text-emerald-700 hover:bg-emerald-50"
          >
            {a.done ? 'Marcar pendiente' : 'Hecha'}
          </button>
          <button type="button" onClick={() => setEditing(a)} className="rounded-md px-2 py-1 text-emerald-700 hover:bg-emerald-50">
            Editar
          </button>
          <button type="button" onClick={() => onDelete(a)} className="rounded-md px-2 py-1 text-red-600 hover:bg-red-50">
            Eliminar
          </button>
        </div>
      </li>
    );
  }

  return (
    <section className="space-y-4 glass-card rounded-xl p-5 text-gray-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Analíticas y revisiones</h2>
        {editing !== 'new' && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            Nueva cita
          </button>
        )}
      </div>

      {editing === 'new' && <AppointmentForm treatments={treatments} onSubmit={submit} onCancel={() => setEditing(null)} />}

      {upcoming.length === 0 ? (
        editing !== 'new' && <p className="text-sm text-gray-500">No tienes citas pendientes.</p>
      ) : (
        <ul className="space-y-3">{upcoming.map(renderItem)}</ul>
      )}

      {past.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            aria-expanded={showPast}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 text-gray-400 transition-transform ${showPast ? 'rotate-90' : ''}`}
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                clipRule="evenodd"
              />
            </svg>
            Pasadas ({past.length})
          </button>
          {showPast && <ul className="mt-3 space-y-3">{past.map(renderItem)}</ul>}
        </div>
      )}
    </section>
  );
}

function DateBadge({ appointment, todayKey }: { appointment: Appointment; todayKey: string }) {
  if (appointment.done) {
    return <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Hecha</span>;
  }
  if (!appointment.date) {
    return <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">Pedir cita</span>;
  }
  return (
    <span className="shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium text-gray-700">
      {relativeDayLabel(appointment.date, todayKey)}
    </span>
  );
}
