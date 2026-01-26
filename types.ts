
export type Page = 'home' | 'history' | 'calendar' | 'absence' | 'settings' | 'dayDetail' | 'widget';

export type AbsenceType = 'Congés payés' | 'RTT' | 'Jour férié' | 'Maladie' | 'Autre';

export interface TimeLog {
  id: string;
  time: string; // HH:mm
  type: 'in' | 'out';
}

export interface TimeEntry {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  logs: TimeLog[];
  breakDuration: number; // in hours (decimal)
  note?: string;
}

export interface Absence {
  id: string;
  type: AbsenceType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  note?: string;
}

export interface Settings {
  contractualHours: number;
  weeklyGoal: number;
  defaultBreak: number;
  yearStartDate: { month: number; day: number };
  initialBalance: number;
  rttEquivalent: number;
  nfcEnabled: boolean;
  nfcConfirmRequired: boolean;
  notificationsEnabled: boolean;
  geofencingEnabled: boolean;
  workLocation?: { lat: number; lng: number };
  display: {
    theme: 'light' | 'dark' | 'system';
    startOfWeek: 'sunday' | 'monday';
  };
}

export interface DaySchedule {
  start1: string | null;
  end1: string | null;
  start2: string | null;
  end2: string | null;
}

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type WorkSchedule = Record<WeekDay, DaySchedule>;

export interface DayInfo {
    date: string;
    workedMinutes: number;
    theoreticalMinutes: number;
    balanceMinutes: number;
    entry?: TimeEntry;
    absence?: Absence;
    isHoliday: boolean;
    isWeekend: boolean;
}
