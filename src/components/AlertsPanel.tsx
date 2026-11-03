import type { Appointment } from '../types/appointment';
import type { Intake, Treatment } from '../types/treatment';
import { appointmentTitle, compareAppointments, isUpcomingSoon, relativeDayLabel } from '../utils/appointments';
import { formatDateKey } from '../utils/dates';
import { daysLeft, formatPills, isLowStock, remainingPills } from '../utils/stock';

interface Props {
  treatments: Treatment[];
  intakes: Intake[];
  appointments: Appointment[];
  todayKey: string;
}

export function AlertsPanel({ treatments, intakes, appointments, todayKey }: Props) {
  const lowStock = treatments
    .map((t) => ({ treatment: t, remaining: remainingPills(t, intakes) }))
    .filter(({ treatment, remaining }) => isLowStock(treatment, remaining));
  const soon = appointments.filter((a) => isUpcomingSoon(a, todayKey)).sort(compareAppointments);
  const toRequest = appointments.filter((a) => !a.done && !a.date);

  if (lowStock.length === 0 && soon.length === 0 && toRequest.length === 0) return null;

  return (
    <section className="space-y-2 glass-card rounded-xl p-5 text-gray-900" aria-label="Avisos">
      <h2 className="text-lg font-semibold">Avisos</h2>
      <ul className="space-y-2 text-sm">
        {lowStock.map(({ treatment, remaining }) => {
          const days = remaining !== null ? daysLeft(treatment, remaining) : null;
          return (
            <li key={treatment.id} className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-amber-900">
              <span className="font-semibold">Comprar {treatment.name}</span>: quedan {formatPills(remaining ?? 0)} pastillas
              {days !== null && ` (unos ${days} días)`}.
            </li>
          );
        })}
        {soon.map((a) => (
          <li key={a.id} className="rounded-lg border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 text-emerald-900">
            <span className="font-semibold">{appointmentTitle(a)}</span> {relativeDayLabel(a.date!, todayKey)}
            {' · '}
            {formatDateKey(a.date!, { weekday: 'short', day: 'numeric', month: 'short' })}
            {a.time && ` a las ${a.time}`}
            {a.doctor && ` con ${a.doctor}`}
          </li>
        ))}
        {toRequest.map((a) => (
          <li key={a.id} className="rounded-lg border border-gray-200/80 bg-white/40 px-3 py-2 text-gray-700">
            Pendiente de pedir cita: <span className="font-semibold">{appointmentTitle(a)}</span>
            {a.doctor && ` con ${a.doctor}`}
          </li>
        ))}
      </ul>
    </section>
  );
}
