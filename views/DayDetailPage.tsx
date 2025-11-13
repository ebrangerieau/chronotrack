
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { formatFullDate, formatDuration, formatSimpleDuration, formatTime, calculateWorkedMinutes, getTodayDateString } from '../utils/dateUtils';
import Icon from '../components/Icon';
import { TimeEntry, TimeLog } from '../types';

interface DayDetailPageProps {
  date: string;
  onBack: () => void;
  onChangeDate: (offset: number) => void;
}

const DayDetailPage: React.FC<DayDetailPageProps> = ({ date, onBack, onChangeDate }) => {
  const { getDayInfo, addOrUpdateTimeEntry, settings } = useData();
  const dayInfo = getDayInfo(date);

  const [entry, setEntry] = useState<Partial<TimeEntry>>(dayInfo.entry || { date, logs: [], breakDuration: settings.defaultBreak });
  const [logs, setLogs] = useState<TimeLog[]>([]);

  useEffect(() => {
    const initialEntry = dayInfo.entry || { date, logs: [], breakDuration: settings.defaultBreak };
    setEntry(initialEntry);
    setLogs(initialEntry.logs?.slice().sort((a, b) => a.time.localeCompare(b.time)) || []);
  }, [date, dayInfo.entry, settings.defaultBreak]);
  
  const liveWorkedMinutes = useMemo(() => {
    return calculateWorkedMinutes(logs, entry.breakDuration ?? settings.defaultBreak, settings.defaultBreak);
  }, [logs, entry.breakDuration, settings.defaultBreak]);

  const liveBalanceMinutes = useMemo(() => {
    const { theoreticalMinutes, absence, isHoliday, isWeekend } = dayInfo;

    if (isWeekend || isHoliday) {
      return 0;
    }
    if (absence) {
      return absence.type === 'RTT' ? Math.round(-settings.rttEquivalent * 60) : 0;
    }

    // It's a normal workday
    const balance = liveWorkedMinutes - theoreticalMinutes;

    // For today or future days with no time logged yet, the balance is 0, not negative.
    if (liveWorkedMinutes === 0 && date >= getTodayDateString()) {
      return 0;
    }

    return Math.round(balance);
  }, [liveWorkedMinutes, dayInfo, date, settings.rttEquivalent]);


  const handleBreakChange = (value: string) => {
    const [h, m] = value.split(':').map(Number);
    setEntry(prev => ({...prev, breakDuration: h + m/60}));
  };
  
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEntry(prev => ({...prev, note: e.target.value}));
  };
  
  const handleLogTimeChange = (id: string, newTime: string) => {
    setLogs(prevLogs => 
      prevLogs.map(log => log.id === id ? { ...log, time: newTime } : log)
    );
  };
  
  const handleDeleteLog = (id: string) => {
    setLogs(prevLogs => prevLogs.filter(log => log.id !== id));
  };

  const handleAddLog = () => {
    const sortedLogs = [...logs].sort((a, b) => a.time.localeCompare(b.time));
    const lastLog = sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1] : null;
    const nextType = lastLog?.type === 'in' ? 'out' : 'in';
    const newLog: TimeLog = {
      id: Date.now().toString(),
      time: formatTime(new Date()),
      type: nextType,
    };
    setLogs(prevLogs => [...prevLogs, newLog].sort((a, b) => a.time.localeCompare(b.time)));
  };

  const handleSave = () => {
    const sortedLogs = [...logs].sort((a, b) => a.time.localeCompare(b.time));
    addOrUpdateTimeEntry({ 
      date, 
      logs: sortedLogs, 
      breakDuration: entry.breakDuration, 
      note: entry.note 
    });
    onBack();
  };
  
  const breakValue = `${Math.floor(entry.breakDuration || 0).toString().padStart(2,'0')}:${Math.round(((entry.breakDuration || 0) % 1) * 60).toString().padStart(2, '0')}`

  return (
    <div className="flex flex-col">
      <header className="flex items-center p-4 pb-2 justify-between sticky top-0 z-10 border-b border-border-light dark:border-border-dark bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-sm">
        <button onClick={onBack} className="flex items-center justify-center size-10 rounded-full hover:bg-primary/10">
          <Icon name="arrow_back" />
        </button>
        <div className="flex items-center justify-center flex-1 gap-2">
            <button onClick={() => onChangeDate(-1)} className="flex items-center justify-center size-10 rounded-full hover:bg-primary/10">
              <Icon name="chevron_left" />
            </button>
            <h2 className="text-lg font-bold text-center whitespace-nowrap">{formatFullDate(date)}</h2>
            <button onClick={() => onChangeDate(1)} className="flex items-center justify-center size-10 rounded-full hover:bg-primary/10">
              <Icon name="chevron_right" />
            </button>
        </div>
        <div className="w-10"></div>
      </header>
      
      <main className="p-4 flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard label="Temps total" value={formatSimpleDuration(liveWorkedMinutes)} />
            <StatCard label="Solde journalier" value={formatDuration(liveBalanceMinutes)} valueColor={liveBalanceMinutes >= 0 ? 'text-positive' : 'text-negative'} />
        </div>

        <div className="flex flex-col gap-4 bg-card-light dark:bg-card-dark rounded-lg border border-border-light dark:border-border-dark p-4">
          <h3 className="font-bold">Pointages</h3>
          <div className="flex flex-col gap-3">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="flex items-center gap-2">
                    <span className={`w-20 shrink-0 font-medium ${log.type === 'in' ? 'text-positive' : 'text-negative'}`}>
                        {log.type === 'in' ? 'Arrivée' : 'Départ'}
                    </span>
                    <input
                        type="time"
                        value={log.time}
                        onChange={(e) => handleLogTimeChange(log.id, e.target.value)}
                        className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm p-1.5 focus:ring-primary focus:border-primary"
                    />
                    <button 
                        onClick={() => handleDeleteLog(log.id)} 
                        className="p-2 rounded-full text-text-subtle-light dark:text-text-subtle-dark hover:bg-negative/10 hover:text-negative"
                        aria-label="Supprimer le pointage"
                    >
                        <Icon name="delete" className="text-xl" />
                    </button>
                </div>
              ))
            ) : (
              <p className="text-text-subtle-light dark:text-text-subtle-dark text-sm text-center py-2">
                Aucun pointage pour cette journée.
              </p>
            )}
            <button 
                onClick={handleAddLog} 
                className="flex items-center justify-center gap-2 w-full mt-2 py-2 px-4 border-2 border-dashed border-border-light dark:border-border-dark rounded-lg text-sm font-semibold text-text-subtle-light dark:text-text-subtle-dark hover:bg-primary/10 hover:text-primary transition-colors"
            >
                <Icon name="add" />
                Ajouter un pointage
            </button>
          </div>
        </div>
        
        <div className="flex flex-col gap-1 bg-card-light dark:bg-card-dark rounded-lg border border-border-light dark:border-border-dark">
            <EditableTimeField icon="coffee" label="Durée de la pause" value={breakValue} onChange={handleBreakChange} type="time" />
        </div>
        
        <div className="flex flex-col gap-2">
            <label className="font-medium text-base" htmlFor="notes">Notes</label>
            <textarea value={entry.note || ''} onChange={handleNoteChange} className="w-full rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark placeholder-text-subtle-light dark:placeholder-text-subtle-dark focus:border-primary focus:ring-primary" id="notes" name="notes" placeholder="Ajouter une note..." rows={4}></textarea>
        </div>

        <div className="flex flex-col gap-4 mt-2">
            <button onClick={handleSave} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 bg-primary text-text-light gap-2 text-base font-bold">
                <Icon name="save" />
                <span>Enregistrer les modifications</span>
            </button>
        </div>
      </main>
    </div>
  );
};


const StatCard: React.FC<{label: string, value: string, valueColor?: string}> = ({label, value, valueColor = ''}) => (
     <div className="flex flex-1 flex-col gap-1 rounded-lg p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <p className="text-text-subtle-light dark:text-text-subtle-dark text-sm font-medium">{label}</p>
        <p className={`tracking-light text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
)

const EditableTimeField: React.FC<{icon: string, label: string, value: string | null, onChange: (value: string) => void, type?: string}> = ({icon, label, value, onChange, type='time'}) => (
    <div className="flex items-center gap-4 px-4 min-h-[72px] py-2 justify-between">
        <div className="flex items-center gap-4">
            <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-12">
                <Icon name={icon} />
            </div>
            <div className="flex flex-col justify-center">
                <p className="text-text-subtle-light dark:text-text-subtle-dark text-sm">{label}</p>
                <input 
                    type={type}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="text-base font-medium bg-transparent border-none p-0 focus:ring-0 w-28"
                />
            </div>
        </div>
    </div>
);


export default DayDetailPage;