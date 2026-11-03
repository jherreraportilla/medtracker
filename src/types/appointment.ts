export type AppointmentKind = 'labTest' | 'checkup';

export interface Appointment {
  id: string;
  kind: AppointmentKind;
  date?: string;
  time?: string;
  doctor?: string;
  specialty?: string;
  place?: string;
  treatmentId?: string;
  notes?: string;
  done: boolean;
  createdAt: number;
}

export type AppointmentInput = Omit<Appointment, 'id' | 'createdAt'>;
