
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { TimeEntry, Absence, Settings, WorkSchedule, DayInfo, WeekDay, TimeLog } from '../types';
import { DEFAULT_SETTINGS, DEFAULT_SCHEDULE, PUBLIC_HOLIDAYS_FR } from '../constants';
import { dateToISODateString, getDayOfWeek, calculateWorkedMinutes, timeStringToMinutes, formatTime, getTodayDateString } from '../utils/dateUtils';

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
  performClockAction: () => Promise<void>;
  closeMissedPunch: (date: string, time: string) => Promise<void>;
  historicalBalance: number;
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
  const [historicalBalance, setHistoricalBalance] = useState(0);

  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        setDataLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
          setSchedule(data.schedule || DEFAULT_SCHEDULE);
          setTimeEntries(data.timeEntries || []);
          setAbsences(data.absences || []);
        } else {
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
    const sanitizedEntry = { ...entry };
    
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
      } as TimeEntry;
      updatedEntries = [...timeEntries, newEntry];
    }
    setTimeEntries(updatedEntries);
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { timeEntries: updatedEntries }, { merge: true });
  };

  const importTimeEntries = async (entriesToImport: TimeEntry[]) => {
    if (!user) return;
    // FIX: Explicitly type the Map to prevent TypeScript from inferring 'unknown' types during sort
    const entriesMap = new Map<string, TimeEntry>(timeEntries.map(e => [e.date, e]));
    for (const entry of entriesToImport) {
        entriesMap.set(entry.date, entry);
    }
    const updatedEntries = Array.from(entriesMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    setTimeEntries(updatedEntries);
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { timeEntries: updatedEntries }, { merge: true });
  };

  const addAbsence = async (absence: Omit<Absence, 'id'>) => {
    if (!user) return;
    const newAbsence: Absence = { id: `${absence.startDate}-${Math.random()}`, ...absence };
    const updatedAbsences = [...absences, newAbsence];
    setAbsences(updatedAbsences);
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { absences: updatedAbsences }, { merge: true });
  };

  const getTheoreticalMinutesForDay = useCallback((date: string): number => {
    const dayIndex = getDayOfWeek(date);
    const dayNames: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayIndex];
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
    if (dateStr === dateToISODateString(new Date())) {
        workedMinutes += liveRunningMinutes;
    }
    const theoreticalMinutes = getTheoreticalMinutesForDay(dateStr);
    
    let balanceMinutes = 0;
    if (!isWeekend && !isHoliday && !absence) {
        if (workedMinutes > 0 || liveRunningMinutes > 0) {
             balanceMinutes = workedMinutes - theoreticalMinutes;
        } else if (new Date(dateStr) < new Date(dateToISODateString(new Date()))) {
             balanceMinutes = -theoreticalMinutes;
        }
    } else if (absence?.type === 'RTT') {
        balanceMinutes = -(settings.rttEquivalent * 60);
    }

    return { date: dateStr, workedMinutes: Math.round(workedMinutes), theoreticalMinutes, balanceMinutes: Math.round(balanceMinutes), entry, absence, isHoliday, isWeekend };
  }, [timeEntries, absences, settings.rttEquivalent, settings.defaultBreak, getTheoreticalMinutesForDay]);

  const performClockAction = async () => {
    if (!user) return;
    const todayDateString = getTodayDateString();
    const todayEntry = timeEntries.find(e => e.date === todayDateString);
    const logs = todayEntry?.logs?.slice().sort((a, b) => a.time.localeCompare(b.time)) || [];
    const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

    const nextLogType = !lastLog || lastLog.type === 'out' ? 'in' : 'out';
    const newLog: TimeLog = { id: Date.now().toString(), time: formatTime(new Date()), type: nextLogType };

    await addOrUpdateTimeEntry({ date: todayDateString, logs: [...logs, newLog] });
  };

  const closeMissedPunch = async (date: string, time: string) => {
      const entry = timeEntries.find(e => e.date === date);
      if (!entry) return;
      const newLog: TimeLog = { id: Date.now().toString(), time: time, type: 'out' };
      await addOrUpdateTimeEntry({ date: date, logs: [...entry.logs, newLog] });
  };

  useEffect(() => {
    if (dataLoading) return;
    let totalBalanceMinutes = settings.initialBalance * 60;
    const today = new Date();
    const todayStr = dateToISODateString(today); 
    const currentYear = today.getFullYear();
    const yearStartDate = new Date(currentYear, settings.yearStartDate.month - 1, settings.yearStartDate.day);
    if (today < yearStartDate) yearStartDate.setFullYear(currentYear - 1);
    let currentDate = new Date(yearStartDate);
    while(dateToISODateString(currentDate) < todayStr){
        const dateStr = dateToISODateString(currentDate);
        const dayInfo = getDayInfo(dateStr);
        totalBalanceMinutes += dayInfo.balanceMinutes;
        currentDate.setDate(currentDate.getDate() + 1);
    }
    setHistoricalBalance(totalBalanceMinutes);
  }, [dataLoading, settings, timeEntries, absences, getDayInfo]);

  const value = { settings, updateSettings, schedule, updateSchedule, timeEntries, addOrUpdateTimeEntry, importTimeEntries, absences, addAbsence, getDayInfo, performClockAction, closeMissedPunch, historicalBalance, dataLoading };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
};
