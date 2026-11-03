import type { Appointment } from '../types/appointment';
import type { DaySlot } from '../types/treatment';
import { appointmentTitle } from '../utils/appointments';
import { formatDateKey } from '../utils/dates';
import { SlotList } from './SlotList';

interface Props {
  dateKey: string;
  todayKey: string;
  slots: DaySlot[];
  appointments: Appointment[];
  onToggle: (slot: DaySlot) => void;
}

export function DayDetail({ dateKey, todayKey, slots, appointments, onToggle }: Props) {
  const isFuture = dateKey > todayKey;
  const dayAppointments = appointments.filter((a) => a.date === dateKey);

  return (
    <div className="space-y-3 border-t border-gray-100 pt-4">
      <h3 className="text-sm font-semibold first-letter:uppercase">
        {formatDateKey(dateKey, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </h3>
      {dayAppointments.length > 0 && (
        <ul className="space-y-1.5">
          {dayAppointments.map((a) => (
            <li key={a.id} className="rounded-lg border border-gray-200/80 bg-white/40 px-3 py-2 text-sm">
              <span className="font-medium text-gray-900">{appointmentTitle(a)}</span>
              <span className="text-gray-500">
                {[a.time, a.doctor, a.place, a.done ? 'hecha' : null].filter(Boolean).map((part) => ` · ${part}`)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {slots.length === 0 ? (
        <p className="text-sm text-gray-500">Sin tomas previstas este día.</p>
      ) : (
        <>
          {isFuture && <p className="text-xs text-gray-500">No se pueden marcar tomas de días futuros.</p>}
          <SlotList slots={slots} onToggle={onToggle} disabled={isFuture} />
        </>
      )}
    </div>
  );
}
