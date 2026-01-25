
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

const SettingsPage: React.FC = () => {
    const { settings, updateSettings, schedule, updateSchedule, importTimeEntries } = useData();
    const { logout } = useAuth();
    const [localSettings, setLocalSettings] = useState(settings);
    const [localSchedule, setLocalSchedule] = useState(schedule);
    const [nfcWriting, setNfcWriting] = useState(false);
    const [nfcWriteStatus, setNfcWriteStatus] = useState<string | null>(null);

    const handleSettingChange = (field: keyof Settings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleDisplayChange = (field: keyof Settings['display'], value: any) => {
         setLocalSettings(prev => ({ ...prev, display: { ...prev.display, [field]: value } }));
    }

    const handleSave = () => {
        updateSettings(localSettings);
        updateSchedule(localSchedule);
    };

    const handleWriteNfc = async () => {
        if (!('NDEFReader' in window)) {
            setNfcWriteStatus("NFC non supporté sur ce navigateur.");
            return;
        }
        
        try {
            setNfcWriting(true);
            setNfcWriteStatus("Approchez le tag NFC...");
            const ndef = new (window as any).NDEFReader();
            await ndef.write("chronotrack-clock-action");
            setNfcWriteStatus("Tag écrit avec succès !");
            if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
        } catch (error) {
            console.error(error);
            setNfcWriteStatus("Erreur lors de l'écriture.");
        } finally {
            setNfcWriting(false);
            setTimeout(() => setNfcWriteStatus(null), 3000);
        }
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
                             <div key={day}>
                                <p className="font-semibold mb-2 text-sm">{weekDayLabels[day]}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="time" value={localSchedule[day].start1 || ''} onChange={e => updateSchedule({...localSchedule, [day]: {...localSchedule[day], start1: e.target.value}})} className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm p-1.5" />
                                    <input type="time" value={localSchedule[day].end2 || localSchedule[day].end1 || ''} onChange={e => updateSchedule({...localSchedule, [day]: {...localSchedule[day], end2: e.target.value}})} className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm p-1.5" />
                                </div>
                             </div>
                        ))}
                    </div>
                </Accordion>

                <Accordion title="Automatisations" icon="auto_fix_high" defaultOpen>
                    <div className="flex flex-col gap-4 px-4 pb-4">
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                            <div className="flex items-center gap-3">
                                <Icon name="nfc" className="text-primary text-2xl" />
                                <div>
                                    <p className="text-sm font-bold">Pointage NFC</p>
                                    <p className="text-xs text-text-subtle-light dark:text-text-subtle-dark">Pointer en passant le téléphone</p>
                                </div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={localSettings.nfcEnabled} 
                                onChange={e => handleSettingChange('nfcEnabled', e.target.checked)}
                                className="size-6 rounded border-border-light text-primary focus:ring-primary"
                            />
                        </div>

                        {localSettings.nfcEnabled && (
                            <div className="p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl">
                                <p className="text-xs font-medium mb-3">Utilitaire de Tag</p>
                                <button 
                                    onClick={handleWriteNfc}
                                    disabled={nfcWriting}
                                    className="w-full py-3 px-4 bg-primary text-text-light font-bold rounded-lg shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {nfcWriting ? <Icon name="sync" className="animate-spin" /> : <Icon name="edit_square" />}
                                    {nfcWriteStatus || "Préparer un Tag NFC"}
                                </button>
                                <p className="text-[10px] text-text-subtle-light mt-2 text-center">Nécessite un tag NFC vierge type NTAG213/215/216.</p>
                            </div>
                        )}
                        
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                             <div className="flex items-center gap-3 mb-2 text-orange-800 dark:text-orange-200">
                                <Icon name="psychology" className="text-xl" />
                                <p className="text-sm font-bold">Assistant de Rattrapage</p>
                            </div>
                            <p className="text-xs text-orange-700 dark:text-orange-300">Cette fonctionnalité est toujours active et vous proposera de clore vos sessions oubliées sur l'écran d'accueil.</p>
                        </div>
                    </div>
                </Accordion>

                <Accordion title="Compte" icon="person">
                    <div className="px-4 pb-4">
                        <button onClick={logout} className="w-full bg-negative text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-colors">
                            Déconnexion
                        </button>
                    </div>
                </Accordion>
            </main>

            <footer className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background-light dark:from-background-dark to-transparent">
                <button onClick={handleSave} className="w-full bg-primary text-text-light font-bold py-3 px-6 rounded-xl shadow-lg active:scale-95 transition-all">
                    Enregistrer les modifications
                </button>
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

export default SettingsPage;
