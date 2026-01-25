// worker.js

// --- UTILS ---
// Copied from utils/dateUtils.ts and adapted for JS

const dateToISODateString = (date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const timeStringToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

const getDayOfWeek = (dateStr) => {
    // Sunday - 0, Monday - 1, ...
    return new Date(dateStr + 'T00:00:00').getDay();
};

const calculateWorkedMinutes = (logs, breakDuration, defaultBreak) => {
    if (!logs || logs.length === 0) {
        return 0;
    }

    const sortedLogs = [...logs].sort((a, b) => a.time.localeCompare(b.time));
    let sessionStart = null;
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
    if (inLogsCount <= 1) {
        const breakMinutes = breakDuration * 60;
        if (presenceMinutes > 5 * 60 && breakMinutes === 0) {
            workedMinutes = presenceMinutes - (defaultBreak * 60);
        } else {
            workedMinutes = presenceMinutes - breakMinutes;
        }
    } else {
        workedMinutes = presenceMinutes;
    }

    return workedMinutes < 0 ? 0 : Math.round(workedMinutes);
};

// --- DATA LOGIC ---
// Copied from contexts/DataContext.tsx and adapted for worker

const getTheoreticalMinutesForDay = (date, schedule) => {
    const dayIndex = getDayOfWeek(date);
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayIndex];
    if (!schedule || !schedule[dayName]) return 0;
    const daySchedule = schedule[dayName];
    
    let totalMinutes = 0;
    if(daySchedule.start1 && daySchedule.end1) {
        totalMinutes += timeStringToMinutes(daySchedule.end1) - timeStringToMinutes(daySchedule.start1);
    }
    if(daySchedule.start2 && daySchedule.end2) {
        totalMinutes += timeStringToMinutes(daySchedule.end2) - timeStringToMinutes(daySchedule.start2);
    }
    return totalMinutes;
};

const getDayInfoForWorker = (dateStr, data) => {
    const { settings, schedule, timeEntries, absences, PUBLIC_HOLIDAYS_FR } = data;
    const entry = timeEntries.find(e => e.date === dateStr);
    const absence = absences.find(a => dateStr >= a.startDate && dateStr <= a.endDate);
    const isHoliday = PUBLIC_HOLIDAYS_FR.some(h => h.date === dateStr);
    const dayIndex = getDayOfWeek(dateStr);
    const isWeekend = dayIndex === 0 || dayIndex === 6;

    let workedMinutes = 0;
    if (entry) {
        workedMinutes = calculateWorkedMinutes(entry.logs, entry.breakDuration, settings.defaultBreak);
    }
    
    const theoreticalMinutes = getTheoreticalMinutesForDay(dateStr, schedule);
    
    let balanceMinutes = 0;
    const todayStr = dateToISODateString(new Date());

    if (!isWeekend && !isHoliday && !absence) {
        // If live minutes are passed, it means we want a live balance, not 0
        if (workedMinutes > 0) {
             balanceMinutes = workedMinutes - theoreticalMinutes;
        } else if (new Date(dateStr) < new Date(todayStr)) {
             balanceMinutes = -theoreticalMinutes; // Past Not worked day
        }
    } else if (absence?.type === 'RTT') {
        balanceMinutes = -(settings.rttEquivalent * 60);
    }

    return {
        balanceMinutes: Math.round(balanceMinutes),
    };
};

// --- WORKER ---

self.onmessage = function(e) {
    const data = e.data;
    const { settings } = data;

    let totalBalanceMinutes = settings.initialBalance * 60;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const currentYear = today.getFullYear();
    const yearStartDate = new Date(`${currentYear}-${settings.yearStartDate.month}-${settings.yearStartDate.day}`);
    
    if (today < yearStartDate) {
        yearStartDate.setFullYear(currentYear - 1);
    }

    let currentDate = new Date(yearStartDate);

    while(currentDate < today){
        const dateStr = dateToISODateString(currentDate);
        const dayInfo = getDayInfoForWorker(dateStr, data);
        totalBalanceMinutes += dayInfo.balanceMinutes;
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    self.postMessage({ historicalBalance: totalBalanceMinutes });
};
