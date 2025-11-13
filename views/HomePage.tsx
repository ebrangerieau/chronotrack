import React from 'react';
import Icon from '../components/Icon';
import { useTime } from '../hooks/useTime';
import { useData } from '../contexts/DataContext';
import { formatTime, formatDuration, getTodayDateString, formatSimpleDuration, timeStringToMinutes } from '../utils/dateUtils';
import { TimeLog } from '../types';

const HomePage: React.FC = () => {
  const time = useTime();
  const { getDayInfo, getAnnualBalance, addOrUpdateTimeEntry } = useData();
  const todayDateString = getTodayDateString();

  const initialTodayInfo = getDayInfo(todayDateString);
  const logs = initialTodayInfo.entry?.logs?.slice().sort((a, b) => a.time.localeCompare(b.time)) || [];
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

  const handleClock = () => {
    const nextLogType = !lastLog || lastLog.type === 'out' ? 'in' : 'out';
    const newLog: TimeLog = {
      id: Date.now().toString(),
      time: formatTime(new Date()),
      type: nextLogType,
    };
    addOrUpdateTimeEntry({
      date: todayDateString,
      logs: [...logs, newLog],
    });
  };

  let runningMinutes = 0;
  if (lastLog && lastLog.type === 'in') {
      const sessionStartMinutes = timeStringToMinutes(lastLog.time);
      const nowMinutes = time.getHours() * 60 + time.getMinutes();
      if (nowMinutes >= sessionStartMinutes) {
        runningMinutes = nowMinutes - sessionStartMinutes;
      }
  }

  // Get live data by passing runningMinutes to context functions
  const todayInfoLive = getDayInfo(todayDateString, runningMinutes);
  const annualBalanceLive = getAnnualBalance(runningMinutes);

  const isClockedIn = lastLog?.type === 'in';
  const mainButtonAction = handleClock;
  const mainButtonText = isClockedIn ? 'DÉPART' : 'ARRIVÉE';
  const mainButtonIcon = isClockedIn ? 'logout' : 'login';
  const firstLog = logs.find(log => log.type === 'in');

  return (
    <div className="relative flex h-full w-full flex-col">
      <header className="flex items-center p-4 pb-2">
        <div className="flex size-12 shrink-0 items-center justify-start">
          <Icon name="track_changes" className="text-3xl text-primary" />
        </div>
        <h2 className="flex-1 text-center text-lg font-bold">ChronoTrack</h2>
        <div className="flex w-12 items-center justify-end"></div>
      </header>

      <main className="flex-grow px-4 pb-8 pt-4">
        <div className="flex flex-col items-center justify-center py-6">
          <h1 className="font-monospace text-5xl font-bold tracking-tighter">
            {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </h1>
          <p className="pt-2 text-base font-normal text-text-subtle-light dark:text-text-subtle-dark">
            {time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="flex justify-center px-4 py-6">
          <button
            onClick={mainButtonAction}
            className="flex flex-1 cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full h-16 min-w-[84px] max-w-[480px] bg-primary px-8 text-lg font-bold tracking-[0.015em] text-text-light shadow-lg shadow-primary/20 transition-all hover:bg-opacity-90 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none"
          >
            <Icon name={mainButtonIcon} />
            <span className="truncate">{mainButtonText}</span>
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-4">
          <p className="text-sm font-medium text-text-subtle-light dark:text-text-subtle-dark">Solde Annualisé</p>
          <p className={`font-monospace text-3xl font-bold ${annualBalanceLive >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatDuration(annualBalanceLive)}
          </p>
        </div>

        <div className="space-y-4 pt-6">
          <div className="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
            <h3 className="mb-4 text-lg font-bold">Aujourd'hui</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="mb-1 text-xs font-medium text-text-subtle-light dark:text-text-subtle-dark">Arrivée</p>
                <p className="font-monospace text-base font-bold">{firstLog?.time || '--:--'}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-text-subtle-light dark:text-text-subtle-dark">Travaillé</p>
                <p className="font-monospace text-base font-bold">
                    {formatSimpleDuration(todayInfoLive.workedMinutes)}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-text-subtle-light dark:text-text-subtle-dark">Solde</p>
                <p className={`font-monospace text-base font-bold ${todayInfoLive.balanceMinutes >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatDuration(todayInfoLive.balanceMinutes)}
                </p>
              </div>
            </div>
            {logs.length > 0 && (
              <div className="mt-4 border-t border-border-light dark:border-border-dark pt-4">
                <h4 className="text-sm font-medium text-text-subtle-light dark:text-text-subtle-dark mb-2">Pointages du jour</h4>
                <ul className="space-y-2">
                  {logs.map(log => (
                    <li key={log.id} className="flex justify-between items-center text-sm">
                      <span className={`font-medium ${log.type === 'in' ? 'text-positive' : 'text-negative'}`}>
                        {log.type === 'in' ? 'Arrivée' : 'Départ'}
                      </span>
                      <span className="font-monospace font-bold">{log.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;