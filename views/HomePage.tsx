
import React, { useMemo, useEffect, useState, useCallback } from 'react';
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
  const [showNfcConfirm, setShowNfcConfirm] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastNfcRead, setLastNfcRead] = useState(0);

  const initialTodayInfo = getDayInfo(todayDateString);
  const logs = initialTodayInfo.entry?.logs?.slice().sort((a, b) => a.time.localeCompare(b.time)) || [];
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const isClockedIn = lastLog?.type === 'in';

  // Assistant de Rattrapage
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
    const dayName = (['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as WeekDay[])[dayIdx];
    const plannedEnd = schedule[dayName].end2 || schedule[dayName].end1 || '18:00';
    return { entry, suggestedEnd: plannedEnd };
  }, [timeEntries, todayDateString, schedule]);

  // Geofencing
  useEffect(() => {
    if (!settings.geofencingEnabled || !settings.workLocation) {
        setIsAtWork(null);
        return;
    }
    const checkLocation = () => {
        navigator.geolocation.getCurrentPosition((pos) => {
            const R = 6371e3;
            const φ1 = pos.coords.latitude * Math.PI/180;
            const φ2 = settings.workLocation!.lat * Math.PI/180;
            const Δφ = (settings.workLocation!.lat - pos.coords.latitude) * Math.PI/180;
            const Δλ = (settings.workLocation!.lng - pos.coords.longitude) * Math.PI/180;
            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            setIsAtWork((R * c) < 100);
        }, () => setIsAtWork(null));
    };
    checkLocation();
    const interval = setInterval(checkLocation, 60000);
    return () => clearInterval(interval);
  }, [settings.geofencingEnabled, settings.workLocation]);

  const triggerClockAction = useCallback(async () => {
    await performClockAction();
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  }, [performClockAction]);

  // Support Web NFC avec Anti-Rebond et Confirmation
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
                const now = Date.now();
                // Anti-rebond : 5 secondes entre deux lectures NFC
                if (now - lastNfcRead < 5000) return;
                setLastNfcRead(now);

                if (window.navigator.vibrate) window.navigator.vibrate(200);
                
                if (settings.nfcConfirmRequired) {
                    setShowNfcConfirm(true);
                } else {
                    triggerClockAction();
                }
            };
        } catch (error) {
            setNfcStatus('error');
        }
    };

    startNfc();
    return () => controller.abort();
  }, [settings.nfcEnabled, settings.nfcConfirmRequired, lastNfcRead, triggerClockAction]);

  let runningMinutes = 0;
  if (lastLog && lastLog.type === 'in') {
      const sessionStartMinutes = timeStringToMinutes(lastLog.time);
      const nowMinutes = time.getHours() * 60 + time.getMinutes();
      if (nowMinutes >= sessionStartMinutes) runningMinutes = nowMinutes - sessionStartMinutes;
  }

  const todayInfoLive = getDayInfo(todayDateString, runningMinutes);
  const annualBalanceLive = historicalBalance + todayInfoLive.balanceMinutes;
  const firstLog = logs.find(log => log.type === 'in');

  return (
    <div className="relative flex h-full w-full flex-col overflow-x-hidden">
      {/* Toast de succès */}
      {showSuccessToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-positive text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in duration-300">
              <Icon name="check_circle" className="text-xl" />
              <span className="font-bold text-sm tracking-wide">POINTAGE ENREGISTRÉ</span>
          </div>
      )}

      {/* Modal de Confirmation NFC */}
      {showNfcConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-card-light dark:bg-card-dark w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-border-light dark:border-border-dark animate-in zoom-in-95 duration-300">
                  <div className="flex flex-col items-center text-center">
                      <div className={`p-4 rounded-full mb-6 ${isClockedIn ? 'bg-negative/10 text-negative' : 'bg-primary/10 text-primary'}`}>
                          <Icon name="nfc" className="text-5xl" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Tag détecté</h3>
                      <p className="text-text-subtle-light dark:text-text-subtle-dark text-sm mb-8 leading-relaxed">
                          Voulez-vous enregistrer votre <br/>
                          <span className="font-bold text-text-light dark:text-text-dark uppercase">
                            {isClockedIn ? 'Départ' : 'Arrivée'}
                          </span> à {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} ?
                      </p>
                      
                      <div className="flex flex-col w-full gap-3">
                        <button 
                            onClick={() => { setShowNfcConfirm(false); triggerClockAction(); }}
                            className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg active:scale-95 transition-transform ${isClockedIn ? 'bg-negative' : 'bg-primary text-text-light'}`}
                        >
                            Confirmer
                        </button>
                        <button 
                            onClick={() => setShowNfcConfirm(false)}
                            className="w-full py-4 rounded-2xl font-bold text-text-subtle-light dark:text-text-subtle-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            Annuler
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

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
            onClick={triggerClockAction}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full h-16 min-w-[84px] px-8 text-lg font-bold tracking-[0.015em] text-text-light shadow-lg transition-all active:scale-95
                        ${isClockedIn ? 'bg-negative shadow-negative/20' : 'bg-primary shadow-primary/20'}`}
          >
            <Icon name={isClockedIn ? 'logout' : 'login'} />
            <span className="truncate">{isClockedIn ? 'DÉPART' : 'ARRIVÉE'}</span>
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
