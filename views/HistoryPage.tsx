import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { dateToISODateString, getWeekDays, addDays, formatSimpleDuration } from '../utils/dateUtils';
import Icon from '../components/Icon';
import { DayInfo } from '../types';

interface HistoryPageProps {
  onSelectDay: (date: string) => void;
}

const DayListItem: React.FC<{ dayInfo: DayInfo, onClick: () => void }> = ({ dayInfo, onClick }) => {
  const { date, workedMinutes, entry, absence, isHoliday, isWeekend } = dayInfo;
  const dayName = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short' });
  const dayOfMonth = new Date(date + 'T00:00:00').getDate();

  const logs = entry?.logs?.slice().sort((a, b) => a.time.localeCompare(b.time)) || [];
  const firstIn = logs.find(l => l.type === 'in');
  const lastOut = logs.slice().reverse().find(l => l.type === 'out');

  let statusColor = 'bg-positive';
  let statusText = `${firstIn?.time || ''} - ${lastOut?.time || ''}`;
  let workedText = formatSimpleDuration(workedMinutes);

  if (absence) {
    statusColor = absence.type === 'RTT' ? 'bg-info' : 'bg-negative';
    statusText = absence.type;
    workedText = '0h 00m';
  } else if (isHoliday) {
    statusColor = 'bg-warning';
    statusText = 'Jour férié';
    workedText = formatSimpleDuration(dayInfo.theoreticalMinutes);
  } else if (isWeekend) {
    statusColor = 'bg-gray-400';
    statusText = 'Repos';
    workedText = '0h 00m';
  } else if (!entry?.logs || entry.logs.length === 0) {
     statusColor = 'bg-gray-300';
     statusText = 'Non pointé';
     workedText = '0h 00m';
  }

  const isClickable = !isWeekend;

  return (
    <div onClick={isClickable ? onClick : undefined} className={`flex items-center gap-4 rounded-lg p-3 border border-border-light dark:border-border-dark ${isClickable ? 'bg-card-light dark:bg-card-dark cursor-pointer' : 'bg-card-light/50 dark:bg-card-dark/50'}`}>
      <div className={`shrink-0 w-1.5 h-10 rounded-full ${statusColor}`}></div>
      <div className="flex flex-col justify-center flex-1">
        <p className={`text-base font-medium line-clamp-1 ${isClickable ? 'text-text-light dark:text-text-dark' : 'text-text-subtle-light dark:text-text-subtle-dark'}`}>{`${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayOfMonth}`}</p>
        <p className="text-sm font-normal line-clamp-2 text-text-subtle-light dark:text-text-subtle-dark">{statusText}</p>
      </div>
      <div className="shrink-0">
        <p className={`text-base font-semibold ${isClickable ? 'text-text-light dark:text-text-dark' : 'text-text-subtle-light dark:text-text-subtle-dark'}`}>{workedText}</p>
      </div>
    </div>
  );
};


const HistoryPage: React.FC<HistoryPageProps> = ({ onSelectDay }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { getDayInfo, settings } = useData();
  
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const weekInfo = useMemo(() => weekDays.map(d => getDayInfo(dateToISODateString(d))), [weekDays, getDayInfo]);

  const totalWorkedMinutes = weekInfo.reduce((sum, day) => sum + day.workedMinutes + (day.isHoliday ? day.theoreticalMinutes : 0) , 0);
  const totalTheoreticalMinutes = settings.weeklyGoal * 60;
  const weeklyBalance = totalWorkedMinutes - totalTheoreticalMinutes;

  const maxWorkedDay = Math.max(...weekInfo.map(d => d.theoreticalMinutes > 0 ? d.theoreticalMinutes : 8*60));

  const changeWeek = (amount: number) => {
    setCurrentDate(prev => addDays(prev, amount * 7));
  };

  return (
    <div className="flex flex-col flex-1 pb-24">
      <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm">
        <div className="flex items-center p-4">
          <div className="flex size-12 shrink-0 items-center justify-center"></div>
          <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center">
            {`Semaine du ${weekDays[0].toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})}`}
          </h1>
          <div className="flex size-12 shrink-0 items-center justify-center"></div>
        </div>
      </header>

      <main className="flex flex-col gap-6 p-4">
        <section className="grid grid-cols-3 gap-4">
            <StatCard label="Heures travaillées" value={formatSimpleDuration(totalWorkedMinutes)} />
            <StatCard label="Objectif" value={formatSimpleDuration(totalTheoreticalMinutes)} />
            <StatCard label="Écart" value={formatSimpleDuration(Math.abs(weeklyBalance))} valueColor={weeklyBalance >= 0 ? 'text-positive' : 'text-negative'} />
        </section>

        <section className="flex flex-col gap-4 rounded-lg p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
          <h3 className="text-base font-semibold">Répartition journalière</h3>
          <div className="relative flex flex-col gap-3 pt-2">
            {weekInfo.map(day => {
              const dayName = new Date(day.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short' });
              const percentage = maxWorkedDay > 0 ? (day.workedMinutes / maxWorkedDay) * 100 : 0;
              return (
                 <div key={day.date} className="grid grid-cols-[3rem_1fr] items-center gap-3">
                    <span className="text-xs font-medium text-text-subtle-light dark:text-text-subtle-dark text-right">{dayName}</span>
                    <div className="h-4 w-full rounded-full bg-primary/20">
                      <div className="h-4 rounded-full bg-primary" style={{ width: `${percentage}%` }}></div>
                    </div>
                </div>
              );
            })}
          </div>
        </section>
        
        <section className="flex flex-col gap-2">
            {weekInfo.map(day => (
                <DayListItem key={day.date} dayInfo={day} onClick={() => onSelectDay(day.date)} />
            ))}
        </section>
      </main>
      
      <div className="fixed bottom-20 left-0 right-0 z-10">
        <div className="flex items-center justify-between p-3 gap-2 max-w-md mx-auto">
          <button onClick={() => changeWeek(-1)} className="flex items-center justify-center size-12 rounded-lg bg-primary/20 dark:bg-primary/30 text-primary">
            <Icon name="chevron_left" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="flex-1 px-4 py-3 text-sm font-semibold rounded-lg bg-primary text-text-light">
            Semaine actuelle
          </button>
          <button onClick={() => changeWeek(1)} className="flex items-center justify-center size-12 rounded-lg bg-primary/20 dark:bg-primary/30 text-primary">
            <Icon name="chevron_right" />
          </button>
        </div>
      </div>

    </div>
  );
};

const StatCard: React.FC<{label: string, value: string, valueColor?: string}> = ({label, value, valueColor = 'text-text-light dark:text-text-dark'}) => (
     <div className="flex flex-1 flex-col gap-2 rounded-lg p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <p className="text-sm font-medium text-text-subtle-light dark:text-text-subtle-dark">{label}</p>
        <p className={`tracking-light text-2xl font-bold leading-tight ${valueColor}`}>{value}</p>
    </div>
)

export default HistoryPage;
