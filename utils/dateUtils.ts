
export const getTodayDateString = (): string => {
  const today = new Date();
  return dateToISODateString(today);
};

export const dateToISODateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
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
  if (isNaN(minutes) || minutes < 0) minutes = 0;
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
