import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { TimeEntry, Absence, Settings, WorkSchedule, DayInfo, WeekDay, TimeLog } from '../types';
import { DEFAULT_SETTINGS, DEFAULT_SCHEDULE, PUBLIC_HOLIDAYS_FR } from '../constants';
import { dateToISODateString, getDayOfWeek, calculateWorkedMinutes, timeStringToMinutes } from '../utils/dateUtils';

interface DataContextProps {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  schedule: WorkSchedule;
  updateSchedule: (newSchedule: WorkSchedule) => Promise<void>;
  timeEntries: TimeEntry[];
  addOrUpdateTimeEntry: (entry: Partial<TimeEntry> & { date: string }) => Promise<void>;
  importTimeEntries: (entries: TimeEntry[]) => Promise<void>;
  absences: Absence[];
  addAbsence: (absence: Omit<Absence, 'id'>) => Promise<void>;
  getDayInfo: (date: string, liveRunningMinutes?: number) => DayInfo;
  getAnnualBalance: (liveRunningMinutes?: number) => number;
  dataLoading: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [schedule, setSchedule] = useState<WorkSchedule>(DEFAULT_SCHEDULE);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        setDataLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings(data.settings || DEFAULT_SETTINGS);
          setSchedule(data.schedule || DEFAULT_SCHEDULE);
          // Simple migration for old data structure
          const loadedEntries = (data.timeEntries || []).map((entry: any) => {
            if (entry.arrivalTime && !entry.logs) {
              const logs: TimeLog[] = [];
              if (entry.arrivalTime) {
                logs.push({ id: `${new Date(`${entry.date}T${entry.arrivalTime}`).getTime()}`, time: entry.arrivalTime, type: 'in' });
              }
              if (entry.departureTime) {
                logs.push({ id: `${new Date(`${entry.date}T${entry.departureTime}`).getTime()}`, time: entry.departureTime, type: 'out' });
              }
              // FIX: Use destructuring to remove deprecated fields and avoid TypeScript errors.
              const { arrivalTime, departureTime, ...restOfEntry } = entry;
              return { ...restOfEntry, logs };
            }
            return entry;
          });
          setTimeEntries(loadedEntries);
          setAbsences(data.absences || []);
        } else {
          // New user, create initial data document
          const initialData = {
            settings: DEFAULT_SETTINGS,
            schedule: DEFAULT_SCHEDULE,
            timeEntries: [],
            absences: [],
          };
          await setDoc(userDocRef, initialData);
          setSettings(DEFAULT_SETTINGS);
          setSchedule(DEFAULT_SCHEDULE);
          setTimeEntries([]);
          setAbsences([]);
        }
        setDataLoading(false);
      } else {
        // User logged out, reset state
        setSettings(DEFAULT_SETTINGS);
        setSchedule(DEFAULT_SCHEDULE);
        setTimeEntries([]);
        setAbsences([]);
        setDataLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    if (!user) return;
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { settings: updatedSettings }, { merge: true });
  };

  const updateSchedule = async (newSchedule: WorkSchedule) => {
    if (!user) return;
    setSchedule(newSchedule);
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { schedule: newSchedule }, { merge: true });
  };

  const addOrUpdateTimeEntry = async (entry: Partial<TimeEntry> & { date: string }) => {
    if (!user) return;

    // Sanitize the incoming entry object to remove undefined values, which Firestore doesn't support.
    const sanitizedEntry = { ...entry };
    (Object.keys(sanitizedEntry) as Array<keyof typeof sanitizedEntry>).forEach(key => {
        if (sanitizedEntry[key] === undefined) {
            delete sanitizedEntry[key];
        }
    });
    
    let updatedEntries: TimeEntry[];
    const existingIndex = timeEntries.findIndex(e => e.date === sanitizedEntry.date);

    if (existingIndex > -1) {
      updatedEntries = [...timeEntries];
      updatedEntries[existingIndex] = { ...updatedEntries[existingIndex], ...sanitizedEntry };
    } else {
      const newEntry: TimeEntry = {
        id: sanitizedEntry.date,
        date: sanitizedEntry.date,
        logs: [],
        breakDuration: settings.defaultBreak,
        ...sanitizedEntry
      };
      updatedEntries = [...timeEntries, newEntry];
    }
    setTimeEntries(updatedEntries);
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { timeEntries: updatedEntries }, { merge: true });
  };

  const importTimeEntries = async (entriesToImport: TimeEntry[]) => {
    if (!user) return;
    
    // Use a Map for efficient merging. New entries will overwrite existing ones for the same date.
    const entriesMap = new Map(timeEntries.map(e => [e.date, e]));
    for (const entry of entriesToImport) {
        entriesMap.set(entry.date, entry);
    }

    // FIX: Explicitly type `a` and `b` to resolve type inference issue.
    const updatedEntries = Array.from(entriesMap.values()).sort((a: TimeEntry, b: TimeEntry) => a.date.localeCompare(b.date));
    setTimeEntries(updatedEntries);
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { timeEntries: updatedEntries }, { merge: true });
  };


  const addAbsence = async (absence: Omit<Absence, 'id'>) => {
    if (!user) return;
    const newAbsence: Absence = {
      id: `${absence.startDate}-${Math.random()}`,
      ...absence
    };
    const updatedAbsences = [...absences, newAbsence];
    setAbsences(updatedAbsences);
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { absences: updatedAbsences }, { merge: true });
  };

  const getTheoreticalMinutesForDay = useCallback((date: string): number => {
    const dayIndex = getDayOfWeek(date);
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayIndex] as WeekDay;
    const daySchedule = schedule[dayName];
    
    let totalMinutes = 0;
    if(daySchedule.start1 && daySchedule.end1) {
        totalMinutes += timeStringToMinutes(daySchedule.end1) - timeStringToMinutes(daySchedule.start1);
    }
    if(daySchedule.start2 && daySchedule.end2) {
        totalMinutes += timeStringToMinutes(daySchedule.end2) - timeStringToMinutes(daySchedule.start2);
    }
    return totalMinutes;
  }, [schedule]);


  const getDayInfo = useCallback((dateStr: string, liveRunningMinutes = 0): DayInfo => {
    const entry = timeEntries.find(e => e.date === dateStr);
    const absence = absences.find(a => dateStr >= a.startDate && dateStr <= a.endDate);
    const isHoliday = PUBLIC_HOLIDAYS_FR.some(h => h.date === dateStr);
    const dayIndex = getDayOfWeek(dateStr);
    const isWeekend = dayIndex === 0 || dayIndex === 6;

    let workedMinutes = 0;
    if (entry) {
        workedMinutes = calculateWorkedMinutes(entry.logs, entry.breakDuration, settings.defaultBreak);
    }
    
    // Add live minutes only for today
    if (dateStr === dateToISODateString(new Date())) {
        workedMinutes += liveRunningMinutes;
    }
    
    const theoreticalMinutes = getTheoreticalMinutesForDay(dateStr);
    
    let balanceMinutes = 0;
    if (!isWeekend && !isHoliday && !absence) {
        // If live minutes are passed, it means we want a live balance, not 0
        if (workedMinutes > 0 || liveRunningMinutes > 0) {
             balanceMinutes = workedMinutes - theoreticalMinutes;
        } else if (new Date(dateStr) < new Date(dateToISODateString(new Date()))) {
             balanceMinutes = -theoreticalMinutes; // Past Not worked day
        }
    } else if (absence?.type === 'RTT') {
        balanceMinutes = -(settings.rttEquivalent * 60);
    }

    return {
        date: dateStr,
        workedMinutes: Math.round(workedMinutes),
        theoreticalMinutes,
        balanceMinutes: Math.round(balanceMinutes),
        entry,
        absence,
        isHoliday,
        isWeekend,
    };
  }, [timeEntries, absences, settings.rttEquivalent, settings.defaultBreak, getTheoreticalMinutesForDay]);


  const getAnnualBalance = useCallback((liveRunningMinutes = 0): number => {
    let totalBalanceMinutes = settings.initialBalance * 60;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearStartDate = new Date(`${currentYear}-${settings.yearStartDate.month}-${settings.yearStartDate.day}`);
    
    if (now < yearStartDate) {
        yearStartDate.setFullYear(currentYear - 1);
    }

    let currentDate = new Date(yearStartDate);
    const today = new Date(dateToISODateString(new Date()));
    const todayStr = dateToISODateString(today);

    while(currentDate <= today){
        const dateStr = dateToISODateString(currentDate);
        const dayInfo = getDayInfo(dateStr, dateStr === todayStr ? liveRunningMinutes : 0);
        totalBalanceMinutes += dayInfo.balanceMinutes;
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return totalBalanceMinutes;

  }, [settings.initialBalance, settings.yearStartDate, getDayInfo]);

  const value = {
    settings,
    updateSettings,
    schedule,
    updateSchedule,
    timeEntries,
    addOrUpdateTimeEntry,
    importTimeEntries,
    absences,
    addAbsence,
    getDayInfo,
    getAnnualBalance,
    dataLoading
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};