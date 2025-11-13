import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/Icon';
import { Settings, DaySchedule, WeekDay, TimeLog, TimeEntry } from '../types';

const weekDayLabels: Record<WeekDay, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
};

const WEEK_DAYS_ORDER: WeekDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DayScheduleEditor: React.FC<{
  day: WeekDay;
  schedule: DaySchedule;
  onChange: (day: WeekDay, newSchedule: DaySchedule) => void;
}> = ({ day, schedule, onChange }) => {
  const handleTimeChange = (field: keyof DaySchedule, value: string) => {
    onChange(day, { ...schedule, [field]: value || null });
  };

  return (
    <div>
      <p className="font-semibold mb-2 text-text-light dark:text-text-dark">{weekDayLabels[day]}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1">
          <input
            type="time"
            value={schedule.start1 || ''}
            onChange={(e) => handleTimeChange('start1', e.target.value)}
            className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm p-1.5 focus:ring-primary focus:border-primary"
          />
          <span className="text-text-subtle-light dark:text-text-subtle-dark">-</span>
          <input
            type="time"
            value={schedule.end1 || ''}
            onChange={(e) => handleTimeChange('end1', e.target.value)}
            className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm p-1.5 focus:ring-primary focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-1">
          <input
            type="time"
            value={schedule.start2 || ''}
            onChange={(e) => handleTimeChange('start2', e.target.value)}
            className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm p-1.5 focus:ring-primary focus:border-primary"
          />
          <span className="text-text-subtle-light dark:text-text-subtle-dark">-</span>
          <input
            type="time"
            value={schedule.end2 || ''}
            onChange={(e) => handleTimeChange('end2', e.target.value)}
            className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm p-1.5 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
};


const SettingsPage: React.FC = () => {
    const { settings, updateSettings, schedule, updateSchedule, importTimeEntries } = useData();
    const { logout } = useAuth();
    const [localSettings, setLocalSettings] = useState(settings);
    const [localSchedule, setLocalSchedule] = useState(schedule);
    const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [importMessage, setImportMessage] = useState('');
    const [installPrompt, setInstallPrompt] = useState<Event | null>(null);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = () => {
        if (!installPrompt) {
            return;
        }
        (installPrompt as any).prompt();
        (installPrompt as any).userChoice.then((choiceResult: { outcome: string }) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('L\'utilisateur a accepté l\'installation');
            } else {
                console.log('L\'utilisateur a refusé l\'installation');
            }
            setInstallPrompt(null);
        });
    };

    const handleSettingChange = (field: keyof Settings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleDisplayChange = (field: keyof Settings['display'], value: any) => {
         setLocalSettings(prev => ({ ...prev, display: { ...prev.display, [field]: value } }));
    }

    const handleScheduleDayChange = (day: WeekDay, newDaySchedule: DaySchedule) => {
        setLocalSchedule(prev => ({
            ...prev,
            [day]: newDaySchedule,
        }));
    };

    const handleSave = () => {
        updateSettings(localSettings);
        updateSchedule(localSchedule);
        // Add feedback for user
    };
    
    const handleLogout = async () => {
        try {
            await logout();
        } catch (err: any) {
            console.error("Failed to log out", err);
        }
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImportStatus('loading');
        setImportMessage('Lecture du fichier...');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) throw new Error("Le fichier CSV est vide ou ne contient que l'en-tête.");

                const header = lines[0].split(',').map(h => h.trim());
                const expectedHeader = ['date', 'start1', 'end1', 'start2', 'end2', 'breakDuration', 'note'];
                if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) {
                    throw new Error("L'en-tête du CSV est incorrect.");
                }

                const entriesToImport: TimeEntry[] = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',');
                    const [date, start1, end1, start2, end2, breakDurationStr, note] = values.map(v => v.trim());
                    
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                        throw new Error(`Format de date invalide à la ligne ${i + 1}: ${date}`);
                    }

                    const logs: TimeLog[] = [];
                    if (start1) logs.push({ id: `${date}-1`, time: start1, type: 'in' });
                    if (end1) logs.push({ id: `${date}-2`, time: end1, type: 'out' });
                    if (start2) logs.push({ id: `${date}-3`, time: start2, type: 'in' });
                    if (end2) logs.push({ id: `${date}-4`, time: end2, type: 'out' });

                    const breakDuration = breakDurationStr ? parseFloat(breakDurationStr) : settings.defaultBreak;
                    if (isNaN(breakDuration)) {
// FIX: Replaced nested backticks with single quotes to avoid a parsing error.
                         throw new Error(`Format de 'breakDuration' invalide à la ligne ${i + 1}: ${breakDurationStr}`);
                    }
                    
                    entriesToImport.push({
                        id: date,
                        date,
                        logs,
                        breakDuration,
                        note: note || '',
                    });
                }

                setImportMessage(`Importation de ${entriesToImport.length} entrées...`);
                await importTimeEntries(entriesToImport);
                setImportStatus('success');
                setImportMessage(`${entriesToImport.length} entrées importées avec succès !`);

            } catch (error: any) {
                setImportStatus('error');
                setImportMessage(error.message);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="pb-24">
            <header className="flex items-center p-4 pb-3 sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10 border-b border-border-light dark:border-border-dark">
                <h1 className="text-xl font-bold leading-tight flex-1 text-center">Réglages</h1>
            </header>

            <main className="flex flex-col p-4 gap-6">
                <Accordion title="Mes horaires" icon="schedule" defaultOpen>
                    <div className="flex flex-col gap-4 px-4 pb-4">
                        {WEEK_DAYS_ORDER.map((day) => (
                            <DayScheduleEditor
                                key={day}
                                day={day}
                                schedule={localSchedule[day]}
                                onChange={handleScheduleDayChange}
                            />
                        ))}
                    </div>
                </Accordion>

                <Accordion title="Paramètres" icon="tune">
                    <div className="flex flex-col gap-4 px-4 pb-4">
                        <InputNumber label="Objectif hebdomadaire" value={localSettings.weeklyGoal} onChange={v => handleSettingChange('weeklyGoal', v)} />
                        <InputTime label="Pause par défaut" value={localSettings.defaultBreak} onChange={v => handleSettingChange('defaultBreak', v)} />
                        <InputNumber label="Solde initial (heures)" value={localSettings.initialBalance} onChange={v => handleSettingChange('initialBalance', v)} />
                    </div>
                </Accordion>
                
                <Accordion title="Import / Export" icon="upload_file">
                    <div className="flex flex-col gap-4 px-4 pb-4">
                        <h3 className="font-semibold text-text-light dark:text-text-dark">Importer des données</h3>
                        <div className="text-sm text-text-subtle-light dark:text-text-subtle-dark space-y-2 p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
                            <p>Importez vos anciennes données via un fichier CSV.</p>
                            <p>L'en-tête doit être : <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">date,start1,end1,start2,end2,breakDuration,note</code></p>
                            <p>Exemple de ligne : <code className="text-xs bg-gray-200 dark:bg-gray-700 p-1 rounded">2024-01-15,09:00,12:30,13:30,17:00,1,Réunion projet</code></p>
                            <p className="font-medium">Attention : Les entrées pour des dates déjà existantes seront remplacées.</p>
                        </div>
                        <input
                            type="file"
                            id="csv-import"
                            accept=".csv"
                            onChange={handleFileImport}
                            className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                        {importStatus !== 'idle' && (
                            <div className={`p-3 rounded-lg text-sm ${
                                importStatus === 'loading' ? 'bg-info/20 text-info' :
                                importStatus === 'success' ? 'bg-positive/20 text-positive' :
                                'bg-negative/20 text-negative'
                            }`}>
                                {importMessage}
                            </div>
                        )}
                    </div>
                </Accordion>


                <Accordion title="Affichage" icon="visibility">
                   <div className="flex flex-col gap-5 px-4 pb-4">
                        <div>
                            <p className="text-sm font-medium text-text-subtle-light dark:text-text-subtle-dark mb-2">Thème</p>
                            <div className="grid grid-cols-3 gap-2 rounded-lg bg-background-light dark:bg-background-dark p-1">
                                <button onClick={() => handleDisplayChange('theme', 'light')} className={`px-3 py-1.5 text-sm font-medium rounded-md ${localSettings.display.theme === 'light' ? 'bg-primary text-white' : ''}`}>Clair</button>
                                <button onClick={() => handleDisplayChange('theme', 'dark')} className={`px-3 py-1.5 text-sm font-medium rounded-md ${localSettings.display.theme === 'dark' ? 'bg-primary text-white' : ''}`}>Sombre</button>
                                <button onClick={() => handleDisplayChange('theme', 'system')} className={`px-3 py-1.5 text-sm font-medium rounded-md ${localSettings.display.theme === 'system' ? 'bg-primary text-white' : ''}`}>Système</button>
                            </div>
                        </div>
                   </div>
                </Accordion>
                
                {installPrompt && (
                    <Accordion title="Application" icon="install_desktop" defaultOpen>
                        <div className="px-4 pb-4">
                            <button onClick={handleInstallClick} className="w-full bg-primary text-text-light font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-opacity-90 transition-colors">
                                Installer l'application
                            </button>
                            <p className="text-xs text-center text-text-subtle-light dark:text-text-subtle-dark mt-2">
                                Installez ChronoTrack sur votre appareil pour un accès rapide et une expérience hors ligne.
                            </p>
                        </div>
                    </Accordion>
                )}

                <Accordion title="Compte" icon="person">
                    <div className="px-4 pb-4">
                        <button onClick={handleLogout} className="w-full bg-negative text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-opacity-90 transition-colors">
                            Déconnexion
                        </button>
                    </div>
                </Accordion>
            </main>

            <footer className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background-light dark:from-background-dark to-transparent">
                <div className="max-w-md mx-auto">
                    <button onClick={handleSave} className="w-full bg-primary text-text-light dark:text-background-dark font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-opacity-90 transition-colors">
                        Enregistrer les modifications
                    </button>
                </div>
            </footer>
        </div>
    );
};

const Accordion: React.FC<{title: string, icon: string, children: React.ReactNode, defaultOpen?: boolean}> = ({title, icon, children, defaultOpen = false}) => {
    return (
        <details className="flex flex-col rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-sm group" open={defaultOpen}>
            <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 list-none">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center shrink-0 size-10 bg-primary/10 rounded-full text-primary">
                        <Icon name={icon} className="text-2xl" />
                    </div>
                    <p className="text-base font-semibold">{title}</p>
                </div>
                <Icon name="expand_more" className="text-text-subtle-light dark:text-text-subtle-dark group-open:rotate-180 transition-transform duration-300"/>
            </summary>
            {children}
        </details>
    );
};

const InputNumber: React.FC<{label: string, value: number, onChange: (val: number) => void}> = ({label, value, onChange}) => (
     <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-subtle-light dark:text-text-subtle-dark">{label}</label>
        <input 
            type="number"
            step="0.01"
            value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            className="w-full bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary" />
    </div>
);
const InputTime: React.FC<{label: string, value: number, onChange: (val: number) => void}> = ({label, value, onChange}) => (
     <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-subtle-light dark:text-text-subtle-dark">{label}</label>
        <input 
            type="time"
            value={`${Math.floor(value).toString().padStart(2,'0')}:${Math.round((value % 1) * 60).toString().padStart(2, '0')}`}
            onChange={e => {
                const [h,m] = e.target.value.split(':');
                onChange(parseInt(h) + parseInt(m)/60)
            }}
            className="w-full bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark rounded-lg focus:ring-primary focus:border-primary" />
    </div>
)

export default SettingsPage;