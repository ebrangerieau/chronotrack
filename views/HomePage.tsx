
import React from 'react';
import Icon from '../components/Icon';
import { useTime } from '../hooks/useTime';
import { useData } from '../contexts/DataContext';
import { formatTime, formatDuration, getTodayDateString, formatSimpleDuration } from '../utils/dateUtils';

const HomePage: React.FC = () => {
  const time = useTime();
  const { getDayInfo, getAnnualBalance, addOrUpdateTimeEntry } = useData();

  const todayDateString = getTodayDateString();
  const todayInfo = getDayInfo(todayDateString);
  const annualBalanceMinutes = getAnnualBalance();

  const workedMinutesToday = todayInfo.workedMinutes > 0 ? todayInfo.workedMinutes : 
    (todayInfo.entry?.arrivalTime ? (new Date().getTime() - new Date(`1970-01-01T${todayInfo.entry.arrivalTime}`).getTime()) / 60000 : 0)

  const handleClockIn = () => {
    addOrUpdateTimeEntry({
      date: todayDateString,
      arrivalTime: formatTime(new Date()),
      departureTime: null,
    });
  };

  const handleClockOut = () => {
    addOrUpdateTimeEntry({
      date: todayDateString,
      departureTime: formatTime(new Date()),
    });
  };

  const hasClockedIn = !!todayInfo.entry?.arrivalTime;
  const hasClockedOut = !!todayInfo.entry?.departureTime;
  const mainButtonAction = hasClockedIn && !hasClockedOut ? handleClockOut : handleClockIn;
  const mainButtonText = hasClockedIn && !hasClockedOut ? 'DÉPART' : 'ARRIVÉE';
  const mainButtonIcon = hasClockedIn && !hasClockedOut ? 'logout' : 'login';

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

        <div className="flex px-4 py-6">
          <button
            onClick={mainButtonAction}
            disabled={hasClockedOut}
            className="flex flex-1 cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full h-16 min-w-[84px] max-w-[480px] bg-primary px-8 text-lg font-bold tracking-[0.015em] text-text-light shadow-lg shadow-primary/20 transition-all hover:bg-opacity-90 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none"
          >
            <Icon name={mainButtonIcon} />
            <span className="truncate">{mainButtonText}</span>
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-4">
          <p className="text-sm font-medium text-text-subtle-light dark:text-text-subtle-dark">Solde Annualisé</p>
          <p className={`font-monospace text-3xl font-bold ${annualBalanceMinutes >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatDuration(annualBalanceMinutes)}
          </p>
        </div>

        <div className="space-y-4 pt-6">
          <div className="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
            <h3 className="mb-4 text-lg font-bold">Aujourd'hui</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="mb-1 text-xs font-medium text-text-subtle-light dark:text-text-subtle-dark">Arrivée</p>
                <p className="font-monospace text-base font-bold">{todayInfo.entry?.arrivalTime || '--:--'}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-text-subtle-light dark:text-text-subtle-dark">Travaillé</p>
                <p className="font-monospace text-base font-bold">
                    {formatSimpleDuration(workedMinutesToday)}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-text-subtle-light dark:text-text-subtle-dark">Solde</p>
                <p className={`font-monospace text-base font-bold ${todayInfo.balanceMinutes >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatDuration(todayInfo.balanceMinutes)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
