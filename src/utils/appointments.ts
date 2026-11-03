import type { Appointment, AppointmentKind } from '../types/appointment';
import { daysBetween } from './dates';

export const KIND_LABELS: Record<AppointmentKind, string> = {
  labTest: 'Analítica',
  checkup: 'Revisión médica',
};

const UPCOMING_ALERT_DAYS = 7;

export function isPastAppointment(a: Appointment, todayKey: string): boolean {
  return a.done || (a.date !== undefined && a.date < todayKey);
}

export function compareAppointments(a: Appointment, b: Appointment): number {
  if (!a.date || !b.date) return a.date ? 1 : b.date ? -1 : a.createdAt - b.createdAt;
  return `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`);
}

export function appointmentTitle(a: Appointment): string {
  return a.specialty ? `${KIND_LABELS[a.kind]} · ${a.specialty}` : KIND_LABELS[a.kind];
}

export function isUpcomingSoon(a: Appointment, todayKey: string): boolean {
  if (a.done || !a.date) return false;
  const diff = daysBetween(todayKey, a.date);
  return diff >= 0 && diff <= UPCOMING_ALERT_DAYS;
}

export function relativeDayLabel(dateKey: string, todayKey: string): string {
  const diff = daysBetween(todayKey, dateKey);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'mañana';
  if (diff > 1) return `en ${diff} días`;
  if (diff === -1) return 'ayer';
  return `hace ${-diff} días`;
}
