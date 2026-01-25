
import { Settings, WorkSchedule } from './types';

export const DEFAULT_SETTINGS: Settings = {
  contractualHours: 35,
  weeklyGoal: 37.25, // 37h15m
  defaultBreak: 1.5, // 1h30m
  yearStartDate: { month: 9, day: 1 },
  initialBalance: 0,
  rttEquivalent: 7.5, // 7h30m
  nfcEnabled: false,
  notificationsEnabled: false,
  geofencingEnabled: false,
  display: {
    theme: 'system',
    startOfWeek: 'monday',
  },
};

export const DEFAULT_SCHEDULE: WorkSchedule = {
  monday:    { start1: '08:00', end1: '12:15', start2: '13:45', end2: '18:00' }, // 8h30
  tuesday:   { start1: '08:00', end1: '12:15', start2: '13:45', end2: '18:00' }, // 8h30
  wednesday: { start1: '08:00', end1: '12:15', start2: null, end2: null }, // 4h15
  thursday:  { start1: '08:00', end1: '12:15', start2: '13:45', end2: '18:00' }, // 8h30
  friday:    { start1: '08:00', end1: '12:15', start2: '13:45', end2: '17:00' }, // 7h30
  saturday:  { start1: null, end1: null, start2: null, end2: null }, // Repos
  sunday:    { start1: null, end1: null, start2: null, end2: null }, // Repos
};

export const PUBLIC_HOLIDAYS_FR: { date: string, name: string }[] = [
    { date: '2024-01-01', name: 'Jour de l\'An' },
    { date: '2024-04-01', name: 'Lundi de Pâques' },
    { date: '2024-05-01', name: 'Fête du Travail' },
    { date: '2024-05-08', name: 'Victoire 1945' },
    { date: '2024-05-09', name: 'Ascension' },
    { date: '2024-05-20', name: 'Lundi de Pentecôte' },
    { date: '2024-07-14', name: 'Fête Nationale' },
    { date: '2024-08-15', name: 'Assomption' },
    { date: '2024-11-01', name: 'Toussaint' },
    { date: '2024-11-11', name: 'Armistice 1918' },
    { date: '2024-12-25', name: 'Noël' },
    { date: '2025-01-01', name: 'Jour de l\'An' },
    { date: '2025-04-21', name: 'Lundi de Pâques' },
    { date: '2025-05-01', name: 'Fête du Travail' },
    { date: '2025-05-08', name: 'Victoire 1945' },
    { date: '2025-05-29', name: 'Ascension' },
    { date: '2025-06-09', name: 'Lundi de Pentecôte' },
    { date: '2025-07-14', name: 'Fête Nationale' },
    { date: '2025-08-15', name: 'Assomption' },
    { date: '2025-11-01', name: 'Toussaint' },
    { date: '2025-11-11', name: 'Armistice 1918' },
    { date: '2025-12-25', name: 'Noël' },
];
