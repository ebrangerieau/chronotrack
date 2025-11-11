
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { formatFullDate, formatDuration, formatSimpleDuration, formatTime } from '../utils/dateUtils';
import Icon from '../components/Icon';
import { TimeEntry } from '../types';

interface DayDetailPageProps {
  date: string;
  onBack: () => void;
}

const DayDetailPage: React.FC<DayDetailPageProps> = ({ date, onBack }) => {
  const { getDayInfo, addOrUpdateTimeEntry } = useData();
  const dayInfo = getDayInfo(date);

  const [entry, setEntry] = useState<Partial<TimeEntry>>(dayInfo.entry || { date, arrivalTime: null, departureTime: null, breakDuration: 1.5 });

  useEffect(() => {
    setEntry(dayInfo.entry || { date, arrivalTime: null, departureTime: null, breakDuration: 1.5 });
  }, [date, dayInfo.entry]);
  
  const handleTimeChange = (field: 'arrivalTime' | 'departureTime', value: string) => {
    setEntry(prev => ({...prev, [field]: value}));
  };
  
  const handleBreakChange = (value: string) => {
    const [h, m] = value.split(':').map(Number);
    setEntry(prev => ({...prev, breakDuration: h + m/60}));
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEntry(prev => ({...prev, note: e.target.value}));
  };

  const handleSave = () => {
    addOrUpdateTimeEntry({ date, ...entry });
    onBack();
  };
  
  const breakValue = `${Math.floor(entry.breakDuration || 0).toString().padStart(2,'0')}:${Math.round(((entry.breakDuration || 0) % 1) * 60).toString().padStart(2, '0')}`

  return (
    <div className="flex flex-col">
      <header className="flex items-center p-4 pb-2 justify-between sticky top-0 z-10 border-b border-border-light dark:border-border-dark bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-sm">
        <button onClick={onBack} className="flex items-center justify-center size-10 rounded-full hover:bg-primary/10">
          <Icon name="arrow_back" />
        </button>
        <h2 className="text-lg font-bold flex-1 text-center">{formatFullDate(date)}</h2>
        <div className="w-10"></div>
      </header>
      
      <main className="p-4 flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Temps total" value={formatSimpleDuration(dayInfo.workedMinutes)} />
            <StatCard label="Solde journalier" value={formatDuration(dayInfo.balanceMinutes)} valueColor={dayInfo.balanceMinutes >= 0 ? 'text-positive' : 'text-negative'} />
        </div>
        
        <div className="flex flex-col gap-1 bg-card-light dark:bg-card-dark rounded-lg border border-border-light dark:border-border-dark">
            <EditableTimeField icon="login" label="Heure d'arrivée" value={entry.arrivalTime} onChange={(v) => handleTimeChange('arrivalTime', v)} />
             <div className="border-b border-border-light dark:border-border-dark mx-4"></div>
            <EditableTimeField icon="logout" label="Heure de départ" value={entry.departureTime} onChange={(v) => handleTimeChange('departureTime', v)} />
             <div className="border-b border-border-light dark:border-border-dark mx-4"></div>
            <EditableTimeField icon="coffee" label="Durée de la pause" value={breakValue} onChange={handleBreakChange} type="time" />
        </div>
        
        <div className="flex flex-col gap-2">
            <label className="font-medium text-base" htmlFor="notes">Notes</label>
            <textarea value={entry.note || ''} onChange={handleNoteChange} className="w-full rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark placeholder-text-subtle-light dark:placeholder-text-subtle-dark focus:border-primary focus:ring-primary" id="notes" name="notes" placeholder="Ajouter une note..." rows="4"></textarea>
        </div>

        <div className="flex flex-col gap-4 mt-2">
            <button onClick={handleSave} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 bg-transparent text-primary gap-2 text-base font-bold border-2 border-primary">
                <Icon name="save" />
                <span>Enregistrer</span>
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
