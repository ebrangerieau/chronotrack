

import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { getMonthDays, dateToISODateString } from '../utils/dateUtils';
import Icon from '../components/Icon';
import { DayInfo } from '../types';

interface CalendarPageProps {
  onSelectDay: (date: string) => void;
}


const CalendarPage: React.FC<CalendarPageProps> = ({ onSelectDay }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const { getDayInfo } = useData();

    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    const monthDays = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth]);
    const monthInfo = useMemo(() => monthDays.map(d => getDayInfo(dateToISODateString(d))), [monthDays, getDayInfo]);

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    // Adjust for Monday start: Sunday is 0, we want it to be 6.
    const startOffset = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);

    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    const getDayColor = (dayInfo: DayInfo) => {
        if (dayInfo.absence) {
            return 'bg-info text-white';
        }
        if (dayInfo.isHoliday) {
            return 'bg-warning text-text-light';
        }
        if (dayInfo.isWeekend) {
            return 'bg-gray-200 dark:bg-gray-700 text-text-subtle-light dark:text-text-subtle-dark';
        }
        if (dayInfo.workedMinutes > 0) {
            if (dayInfo.balanceMinutes >= 0) return 'bg-positive text-white';
            return 'bg-orange-400 text-white'; // Partial day or negative balance
        }
        if(new Date(dayInfo.date) < new Date(dateToISODateString(new Date()))){
            return 'bg-negative text-white'; // Not worked
        }
        return 'bg-card-light dark:bg-card-dark';
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between pb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <Icon name="chevron_left" />
                </button>
                <h2 className="text-lg font-bold">{monthName}</h2>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <Icon name="chevron_right" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-text-subtle-light dark:text-text-subtle-dark mb-2">
                {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {monthInfo.map(dayInfo => (
                    <button
                        key={dayInfo.date}
                        onClick={() => !dayInfo.isWeekend && onSelectDay(dayInfo.date)}
                        className={`flex items-center justify-center size-10 rounded-lg text-sm font-medium transition-transform active:scale-95 ${getDayColor(dayInfo)}`}
                    >
                        {new Date(dayInfo.date + 'T00:00:00').getDate()}
                    </button>
                ))}
            </div>
            
            <div className="px-4 pt-6">
                <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    <LegendItem color="bg-positive" label="Journée complète" />
                    <LegendItem color="bg-orange-400" label="Journée partielle" />
                    <LegendItem color="bg-negative" label="Absence" />
                    <LegendItem color="bg-info" label="Congé/RTT" />
                    <LegendItem color="bg-warning" label="Férié" />
                    <LegendItem color="bg-gray-200 dark:bg-gray-700" label="Weekend" />
                </div>
            </div>
        </div>
    );
};

const LegendItem: React.FC<{color: string, label: string}> = ({color, label}) => (
     <div className="flex items-center gap-2">
        <div className={`size-3 rounded-full ${color}`}></div>
        <span>{label}</span>
    </div>
)

export default CalendarPage;
