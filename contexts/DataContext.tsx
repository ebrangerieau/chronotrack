
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { TimeEntry, Absence, Settings, WorkSchedule, AbsenceType, DayInfo, WeekDay } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { DEFAULT_SETTINGS, DEFAULT_SCHEDULE, PUBLIC_HOLIDAYS_FR } from '../constants';
import { dateToISODateString, getDayOfWeek, roundToNearest15Minutes, timeStringToMinutes } from '../utils/dateUtils';

interface DataContextProps {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  schedule: WorkSchedule;
  updateSchedule: (newSchedule: WorkSchedule) => void;
  timeEntries: TimeEntry[];
  addOrUpdateTimeEntry: (entry: Partial<TimeEntry> & { date: string }) => void;
  absences: Absence[];
  addAbsence: (absence: Omit<Absence, 'id'>) => void;
  getDayInfo: (date: string) => DayInfo;
  getAnnualBalance: () => number;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useLocalStorage<Settings>('chrono-settings', DEFAULT_SETTINGS);
  const [schedule, setSchedule] = useLocalStorage<WorkSchedule>('chrono-schedule', DEFAULT_SCHEDULE);
  const [timeEntries, setTimeEntries] = useLocalStorage<TimeEntry[]>('chrono-timeEntries', []);
  const [absences, setAbsences] = useLocalStorage<Absence[]>('chrono-absences', []);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateSchedule = (newSchedule: WorkSchedule) => {
    setSchedule(newSchedule);
  };

  const addOrUpdateTimeEntry = (entry: Partial<TimeEntry> & { date: string }) => {
    setTimeEntries(prev => {
      const existingIndex = prev.findIndex(e => e.date === entry.date);
      if (existingIndex > -1) {
        const updatedEntries = [...prev];
        updatedEntries[existingIndex] = { ...updatedEntries[existingIndex], ...entry };
        return updatedEntries;
      } else {
        const newEntry: TimeEntry = {
          id: entry.date,
          breakDuration: settings.defaultBreak,
          arrivalTime: null,
          departureTime: null,
          ...entry
        };
        return [...prev, newEntry];
      }
    });
  };

  const addAbsence = (absence: Omit<Absence, 'id'>) => {
    const newAbsence: Absence = {
      id: `${absence.startDate}-${Math.random()}`,
      ...absence
    };
    setAbsences(prev => [...prev, newAbsence]);
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


  const getDayInfo = useCallback((dateStr: string): DayInfo => {
    const entry = timeEntries.find(e => e.date === dateStr);
    const absence = absences.find(a => dateStr >= a.startDate && dateStr <= a.endDate);
    const isHoliday = PUBLIC_HOLIDAYS_FR.some(h => h.date === dateStr);
    const dayIndex = getDayOfWeek(dateStr);
    const isWeekend = dayIndex === 0 || dayIndex === 6;

    let workedMinutes = 0;
    if (entry && entry.arrivalTime && entry.departureTime) {
        const arrival = roundToNearest15Minutes(new Date(`1970-01-01T${entry.arrivalTime}`));
        const departure = roundToNearest15Minutes(new Date(`1970-01-01T${entry.departureTime}`));
        const arrivalMinutes = arrival.getHours() * 60 + arrival.getMinutes();
        const departureMinutes = departure.getHours() * 60 + departure.getMinutes();
        const presenceMinutes = departureMinutes - arrivalMinutes;
        const breakMinutes = entry.breakDuration * 60;
        if(presenceMinutes > (5*60) && breakMinutes === 0){
             workedMinutes = presenceMinutes - (settings.defaultBreak * 60);
        } else {
             workedMinutes = presenceMinutes - breakMinutes;
        }
    }
    
    const theoreticalMinutes = getTheoreticalMinutesForDay(dateStr);
    
    let balanceMinutes = 0;
    if (!isWeekend && !isHoliday && !absence) {
        balanceMinutes = workedMinutes > 0 ? workedMinutes - theoreticalMinutes : 0;
        if(workedMinutes === 0 && new Date(dateStr) < new Date(dateToISODateString(new Date()))){
             balanceMinutes = -theoreticalMinutes; // Not worked day
        }
    } else if (absence?.type === 'RTT') {
        balanceMinutes = -(settings.rttEquivalent * 60);
    }


    return {
        date: dateStr,
        workedMinutes,
        theoreticalMinutes,
        balanceMinutes,
        entry,
        absence,
        isHoliday,
        isWeekend,
    };
  }, [timeEntries, absences, settings.rttEquivalent, settings.defaultBreak, getTheoreticalMinutesForDay]);


  const getAnnualBalance = useCallback((): number => {
    let totalBalanceMinutes = settings.initialBalance * 60;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearStartDate = new Date(`${currentYear}-${settings.yearStartDate.month}-${settings.yearStartDate.day}`);
    
    if (now < yearStartDate) {
        yearStartDate.setFullYear(currentYear - 1);
    }

    let currentDate = new Date(yearStartDate);
    const today = new Date(dateToISODateString(new Date()));

    while(currentDate <= today){
        const dateStr = dateToISODateString(currentDate);
        const dayInfo = getDayInfo(dateStr);
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
    absences,
    addAbsence,
    getDayInfo,
    getAnnualBalance,
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
