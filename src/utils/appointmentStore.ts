import type { Appointment, AppointmentInput } from '../types/appointment';
import { newId, withDb } from './pillDb';

export function listAppointments(): Promise<Appointment[]> {
  return withDb((db) => db.getAllFromIndex('appointments', 'by-createdAt'));
}

async function putAppointment(appointment: Appointment): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction('appointments', 'readwrite', { durability: 'strict' });
    await Promise.all([tx.store.put(appointment), tx.done]);
  });
}

export async function saveAppointment(data: AppointmentInput): Promise<Appointment> {
  const appointment: Appointment = { ...data, id: newId(), createdAt: Date.now() };
  await putAppointment(appointment);
  return appointment;
}

export function updateAppointment(appointment: Appointment): Promise<void> {
  return putAppointment(appointment);
}

export async function deleteAppointment(id: string): Promise<void> {
  await withDb(async (db) => {
    const tx = db.transaction('appointments', 'readwrite', { durability: 'strict' });
    await Promise.all([tx.store.delete(id), tx.done]);
  });
}
