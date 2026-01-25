
import React, { useMemo, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { useTime } from '../hooks/useTime';
import { useData } from '../contexts/DataContext';
import { formatDuration, getTodayDateString, formatSimpleDuration, timeStringToMinutes, getDayOfWeek } from '../utils/dateUtils';
import { WeekDay } from '../types';

const HomePage: React.FC = () => {
  const time = useTime();
  const { getDayInfo, performClockAction, closeMissedPunch, historicalBalance, timeEntries, schedule, settings } = useData();
  const todayDateString = getTodayDateString();
  const [nfcStatus, setNfcStatus] = useState<'idle' | 'listening' | 'error' | 'unsupported'>('idle');
  const [isAtWork, setIsAtWork] = useState<boolean | null>(null);

  const initialTodayInfo = getDayInfo(todayDateString);
  const logs = initialTodayInfo.entry?.logs?.slice().sort((a, b) => a.time.localeCompare(b.time)) || [];
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

  // Assistant de Rattrapage : Détection de sessions oubliées sur les 7 derniers jours
  const missedPunch = useMemo(() => {
    const entry = timeEntries.find(entry => {
      if (entry.date === todayDateString) return false;
      const entryLogs = entry.logs || [];
      if (entryLogs.length === 0) return false;
      const lastEntryLog = [...entryLogs].sort((a, b) => a.time.localeCompare(b.time)).pop();
      return lastEntryLog?.type === 'in';
    });

    if (!entry) return null;

    const dayIdx = getDayOfWeek(entry.date);
    const dayNames: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayIdx];
    const plannedEnd = schedule[dayName].end2 || schedule[dayName].end1 || '18:00';

    return { entry, suggestedEnd: plannedEnd };
  }, [timeEntries, todayDateString, schedule]);

  // Support Geofencing : Vérification de la position
  useEffect(() => {
    if (!settings.geofencingEnabled || !settings.workLocation) {
        setIsAtWork(null);
        return;
    }

    const checkLocation = () => {
        navigator.geolocation.getCurrentPosition((pos) => {
            const R = 6371e3; // Rayon de la terre
            const φ1 = pos.coords.latitude * Math.PI/180;
            const φ2 = settings.workLocation!.lat * Math.PI/180;
            const Δφ = (settings.workLocation!.lat - pos.coords.latitude) * Math.PI/180;
            const Δλ = (settings.workLocation!.lng - pos.coords.longitude) * Math.PI/180;

            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ/2) * Math.sin(Δλ/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const d = R * c; // Distance en mètres

            setIsAtWork(d < 100); // Seuil de 100 mètres
        }, (err) => {
            console.error("Geofencing error:", err);
            setIsAtWork(null);
        });
    };

    checkLocation();
    const interval = setInterval(checkLocation, 60000); // Vérifier toutes les minutes
    return () => clearInterval(interval);
  }, [settings.geofencingEnabled, settings.workLocation]);

  // Support Web NFC
  useEffect(() => {
    if (!settings.nfcEnabled) return;
    if (!('NDEFReader' in window)) {
        setNfcStatus('unsupported');
        return;
    }

    let controller = new AbortController();
    const startNfc = async () => {
        try {
            const ndef = new (window as any).NDEFReader();
            await ndef.scan({ signal: controller.signal });
            setNfcStatus('listening');
            ndef.onreading = (event: any) => {
                if (window.navigator.vibrate) window.navigator.vibrate(100);
                performClockAction();
            };
        } catch (error) {
            setNfcStatus('error');
        }
    };

    startNfc();
    return () => controller.abort();
  }, [settings.nfcEnabled, performClockAction]);

  let runningMinutes = 0;
  if (lastLog && lastLog.type === 'in') {
      const sessionStartMinutes = timeStringToMinutes(lastLog.time);
      const nowMinutes = time.getHours() * 60 + time.getMinutes();
      if (nowMinutes >= sessionStartMinutes) {
        runningMinutes = nowMinutes - sessionStartMinutes;
      }
  }

  const todayInfoLive = getDayInfo(todayDateString, runningMinutes);
  const annualBalanceLive = historicalBalance + todayInfoLive.balanceMinutes;

  const isClockedIn = lastLog?.type === 'in';
  const mainButtonText = isClockedIn ? 'DÉPART' : 'ARRIVÉE';
  const mainButtonIcon = isClockedIn ? 'logout' : 'login';
  const firstLog = logs.find(log => log.type === 'in');

  return (
    <div className="relative flex h-full w-full flex-col">
      <header className="flex items-center p-4 pb-2">
        <div className="flex size-12 shrink-0 items-center justify-start">
          <Icon name="track_changes" className="text-3xl text-primary" />
        </div>
        <div className="flex-1 flex flex-col items-center">
            <h2 className="text-lg font-bold">ChronoTrack</h2>
            {settings.geofencingEnabled && isAtWork !== null && (
                <div className="flex items-center gap-1">
                    <div className={`size-2 rounded-full ${isAtWork ? 'bg-positive animate-pulse' : 'bg-text-subtle-light'}`}></div>
                    <span className="text-[10px] font-medium text-text-subtle-light uppercase tracking-widest">
                        {isAtWork ? 'Au bureau' : 'Extérieur'}
                    </span>
                </div>
            )}
        </div>
        <div className="flex w-12 items-center justify-end">
            {settings.nfcEnabled && (
                <Icon name={nfcStatus === 'listening' ? 'nfc' : 'nfc_off'} 
                      className={`text-xl ${nfcStatus === 'listening' ? 'text-primary animate-pulse' : 'text-text-subtle-light'}`} 
                />
            )}
        </div>
      </header>

      <main className="flex-grow px-4 pb-8 pt-4">
        {missedPunch && (
          <div className="mb-6 overflow-hidden rounded-2xl bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-200 dark:bg-orange-800/40 rounded-full">
                    <Icon name="history_toggle_off" className="text-orange-600 dark:text-orange-400 text-xl" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-orange-900 dark:text-orange-100">Oubli détecté</p>
                  <p className="text-xs text-orange-800 dark:text-orange-200 mt-1">
                    Pointage du {new Date(missedPunch.entry.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })} non fermé.
                  </p>
                </div>
            </div>
            <div className="mt-4 flex gap-2">
                <button 
                    onClick={() => closeMissedPunch(missedPunch.entry.date, missedPunch.suggestedEnd)}
                    className="flex-1 py-2 px-3 bg-orange-500 text-white rounded-lg text-xs font-bold shadow-md active:scale-95 transition-transform"
                >
                    Clore à {missedPunch.suggestedEnd}
                </button>
                <button 
                    className="py-2 px-4 bg-gray-200 dark:bg-gray-700 rounded-lg text-xs font-semibold"
                    onClick={() => {/* Ici on pourrait naviguer vers le détail du jour */}}
                >
                    Détails
                </button>
            </div>
          </div>
        )}

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
            onClick={performClockAction}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full h-16 min-w-[84px] max-w-[480px] px-8 text-lg font-bold tracking-[0.015em] text-text-light shadow-lg transition-all active:scale-95
                        ${isClockedIn ? 'bg-negative shadow-negative/20' : 'bg-primary shadow-primary/20'}`}
          >
            <Icon name={mainButtonIcon} />
            <span className="truncate">{mainButtonText}</span>
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-4">
          <p className="text-sm font-medium text-text-subtle-light dark:text-text-subtle-dark">Solde Annuel</p>
          <p className={`font-monospace text-3xl font-bold ${annualBalanceLive >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatDuration(annualBalanceLive)}
          </p>
        </div>

        <div className="space-y-4 pt-6">
          <div className="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
            <h3 className="mb-4 text-lg font-bold">Aujourd'hui</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="mb-1 text-xs font-medium text-text-subtle-light dark:text-text-subtle-dark">Arrivée</p>
                <p className="font-monospace text-base font-bold">{firstLog?.time || '--:--'}</p>
              </div>
               <div>
                <p className="mb-1 text-xs font-medium text-text-subtle-light dark:text-text-subtle-dark">Prévu</p>
                <p className="font-monospace text-base font-bold">
                    {formatSimpleDuration(todayInfoLive.theoreticalMinutes)}
                </p>
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
