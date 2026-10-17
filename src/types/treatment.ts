export type FrequencyKind = 'daily' | 'intervalDays' | 'weekdays';

export interface Frequency {
  kind: FrequencyKind;
  timesPerDay: number;
  intervalDays?: number;
  weekdays?: number[];
  times?: string[];
}

export interface Treatment {
  id: string;
  name: string;
  dose?: string;
  frequency: Frequency;
  startDate: string;
  endDate?: string;
  notes?: string;
  color: string;
  archived: boolean;
  createdAt: number;
}

export type TreatmentInput = Omit<Treatment, 'id' | 'createdAt'>;

export interface Intake {
  id: string;
  treatmentId: string;
  date: string;
  slot: number;
  takenAt: number;
}

export interface DaySlot {
  treatment: Treatment;
  slot: number;
  time?: string;
  intake?: Intake;
}

export type DayState = 'complete' | 'partial' | 'missed' | 'notDue' | 'future';

export interface TreatmentProgress {
  dayNumber: number;
  totalDays?: number;
  expectedIntakes: number;
  takenIntakes: number;
  adherence: number;
  currentStreak: number;
  longestStreak: number;
}
