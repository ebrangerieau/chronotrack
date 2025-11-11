
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Icon from '../components/Icon';
import { Settings, DaySchedule, WeekDay } from '../types';

const SettingsPage: React.FC = () => {
    const { settings, updateSettings, schedule, updateSchedule } = useData();
    const [localSettings, setLocalSettings] = useState(settings);

    const handleSettingChange = (field: keyof Settings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleDisplayChange = (field: keyof Settings['display'], value: any) => {
         setLocalSettings(prev => ({ ...prev, display: { ...prev.display, [field]: value } }));
    }

    const handleSave = () => {
        updateSettings(localSettings);
        // Add feedback for user
    };
    
    return (
        <div className="pb-24">
            <header className="flex items-center p-4 pb-3 sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10 border-b border-border-light dark:border-border-dark">
                <h1 className="text-xl font-bold leading-tight flex-1 text-center">Réglages</h1>
            </header>

            <main className="flex flex-col p-4 gap-6">
                <Accordion title="Mes horaires" icon="schedule" defaultOpen>
                    {/* Schedule editing UI would go here */}
                     <p className="text-center text-sm p-4 text-text-subtle-light dark:text-text-subtle-dark">La modification des horaires sera bientôt disponible.</p>
                </Accordion>

                <Accordion title="Paramètres" icon="tune">
                    <div className="flex flex-col gap-4 px-4 pb-4">
                        <InputNumber label="Objectif hebdomadaire" value={localSettings.weeklyGoal} onChange={v => handleSettingChange('weeklyGoal', v)} />
                        <InputTime label="Pause par défaut" value={localSettings.defaultBreak} onChange={v => handleSettingChange('defaultBreak', v)} />
                        <InputNumber label="Solde initial (heures)" value={localSettings.initialBalance} onChange={v => handleSettingChange('initialBalance', v)} />
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

const Accordion: React.FC<{title: string, icon: string, children: React.ReactNode, defaultOpen?: boolean}> = ({title, icon, children, defaultOpen = false}) => (
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

const InputNumber: React.FC<{label: string, value: number, onChange: (val: number) => void}> = ({label, value, onChange}) => (
     <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-subtle-light dark:text-text-subtle-dark">{label}</label>
        <input 
            type="number"
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
