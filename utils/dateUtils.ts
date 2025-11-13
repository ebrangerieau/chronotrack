import { TimeLog } from '../types';

export const getTodayDateString = (): string => {
  const today = new Date();
  return dateToISODateString(today);
};

export const dateToISODateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

export const formatFullDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00'); // Prevent timezone issues
  return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

export const parseTimeString = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const timeStringToMinutes = (timeStr: string | null): number => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

export const roundToNearest15Minutes = (date: Date): Date => {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.round(minutes / 15) * 15;
  const newDate = new Date(date);
  newDate.setMinutes(roundedMinutes, 0, 0);
  // Handle rounding up to the next hour
  if (roundedMinutes === 60) {
    newDate.setHours(newDate.getHours() + 1);
    newDate.setMinutes(0);
  }
  return newDate;
};


export const formatDuration = (minutes: number): string => {
  if (isNaN(minutes)) minutes = 0;
  const sign = minutes < 0 ? '-' : '+';
  const absMinutes = Math.abs(minutes);
  const h = Math.floor(absMinutes / 60);
  const m = Math.round(absMinutes % 60);
  return `${sign}${h}h ${m.toString().padStart(2, '0')}m`;
};

export const formatSimpleDuration = (minutes: number): string => {
  if (isNaN(minutes) || minutes < 0) minutes = 0;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export const getDayOfWeek = (dateStr: string): number => {
    // Sunday - 0, Monday - 1, ...
    return new Date(dateStr + 'T00:00:00').getDay();
}

export const getWeekDays = (date: Date): Date[] => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(start.setDate(diff));
    
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        return d;
    });
}

export const getMonthDays = (year: number, month: number): Date[] => {
    const date = new Date(year, month, 1);
    const days: Date[] = [];
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
};

export const addDays = (date: Date, days: number): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
};

export const calculateWorkedMinutes = (
    logs: TimeLog[], 
    breakDuration: number, // in hours
    defaultBreak: number // in hours
): number => {
    if (!logs || logs.length === 0) {
        return 0;
    }

    const sortedLogs = [...logs].sort((a, b) => a.time.localeCompare(b.time));
    let sessionStart: Date | null = null;
    let presenceMinutes = 0;
    const inLogsCount = sortedLogs.filter(l => l.type === 'in').length;

    for (const log of sortedLogs) {
        if (log.type === 'in' && sessionStart === null) {
            sessionStart = new Date(`1970-01-01T${log.time}`);
        } else if (log.type === 'out' && sessionStart !== null) {
            const sessionEnd = new Date(`1970-01-01T${log.time}`);
            if (sessionEnd > sessionStart) {
                presenceMinutes += (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);
            }
            sessionStart = null;
        }
    }

    let workedMinutes = 0;
    // If there is only one session (or one 'in' and one 'out'), apply the break duration.
    // Otherwise, the breaks are the gaps between sessions and are already excluded from presenceMinutes.
    if (inLogsCount <= 1) {
        const breakMinutes = breakDuration * 60;
        // Apply default break if applicable and no break is specified for a long session
        if (presenceMinutes > 5 * 60 && breakMinutes === 0) {
            workedMinutes = presenceMinutes - (defaultBreak * 60);
        } else {
            workedMinutes = presenceMinutes - breakMinutes;
        }
    } else {
        // With multiple sessions, breaks are implicit.
        workedMinutes = presenceMinutes;
    }

    return workedMinutes < 0 ? 0 : Math.round(workedMinutes);
};