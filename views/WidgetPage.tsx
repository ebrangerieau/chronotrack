
import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import { useTime } from '../hooks/useTime';
import { useData } from '../contexts/DataContext';
import { getTodayDateString } from '../utils/dateUtils';

const WidgetPage: React.FC = () => {
  const time = useTime();
  const { getDayInfo, performClockAction } = useData();
  const todayDateString = getTodayDateString();
  
  // We need a state to force re-render when clocking action is performed
  const [lastActionTimestamp, setLastActionTimestamp] = useState(Date.now());

  const todayInfo = getDayInfo(todayDateString);
  const logs = todayInfo.entry?.logs?.slice().sort((a, b) => a.time.localeCompare(b.time)) || [];
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

  const isClockedIn = lastLog?.type === 'in';
  
  const handleClock = async () => {
      await performClockAction();
      setLastActionTimestamp(Date.now()); // Trigger re-render
  };

  const mainButtonText = isClockedIn ? 'Pointer mon Départ' : 'Pointer mon Arrivée';
  const mainButtonIcon = isClockedIn ? 'logout' : 'login';
  const statusText = isClockedIn ? `Au travail depuis ${lastLog.time}` : "Vous n'êtes pas au travail";
  const statusColor = isClockedIn ? 'bg-positive' : 'bg-text-subtle-light dark:bg-text-subtle-dark';

  return (
    <div className="flex h-screen flex-col items-center justify-between bg-background-light dark:bg-background-dark p-6 font-display text-text-light dark:text-text-dark">
        <header className="w-full flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Icon name="track_changes" className="text-2xl text-primary" />
                <h1 className="text-xl font-bold">ChronoTrack</h1>
            </div>
            <a href="/" className="flex items-center justify-center size-10 rounded-full hover:bg-primary/10" aria-label="Retour à l'application complète">
                <Icon name="close" />
            </a>
        </header>

        <main className="flex flex-col items-center justify-center gap-8 text-center">
            <div className="flex flex-col items-center">
                <h2 className="font-monospace text-6xl font-bold tracking-tighter">
                    {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </h2>
                <p className="mt-2 text-lg font-normal text-text-subtle-light dark:text-text-subtle-dark">
                    {time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
            </div>
            
             <div className="flex items-center gap-3 rounded-full px-4 py-2" style={{ backgroundColor: isClockedIn ? 'var(--tw-color-positive-fg, #16a34a1a)' : 'var(--tw-color-slate-fg, #64748b1a)' }}>
                 <div className={`size-3 rounded-full ${statusColor}`}></div>
                 <span className={`text-base font-semibold ${isClockedIn ? 'text-positive' : 'text-text-subtle-light dark:text-text-subtle-dark'}`}>{statusText}</span>
            </div>
        </main>

        <footer className="w-full max-w-md">
            <button
                onClick={handleClock}
                className={`flex w-full h-20 items-center justify-center gap-4 rounded-xl px-8 text-xl font-bold text-text-light shadow-lg transition-all active:scale-95
                    ${isClockedIn 
                        ? 'bg-negative shadow-negative/30' 
                        : 'bg-primary shadow-primary/30'}`}
            >
                <Icon name={mainButtonIcon} className="text-3xl" />
                <span className="truncate">{mainButtonText}</span>
            </button>
        </footer>
    </div>
  );
};

export default WidgetPage;
