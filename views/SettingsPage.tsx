
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
    const { settings, updateSettings, schedule, updateSchedule } = useData();
    const { logout } = useAuth();
    const [localSettings, setLocalSettings] = useState(settings);
    const [localSchedule, setLocalSchedule] = useState(schedule);
    const [nfcWriting, setNfcWriting] = useState(false);
    const [nfcWriteStatus, setNfcWriteStatus] = useState<string | null>(null);
    const [geoStatus, setGeoStatus] = useState<string | null>(null);

    const handleSettingChange = (field: keyof Settings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        updateSettings(localSettings);
        updateSchedule(localSchedule);
    };

    const toggleNotifications = async (enabled: boolean) => {
        if (enabled && 'Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                handleSettingChange('notificationsEnabled', true);
            } else {
                alert("Permission de notification refusée.");
                handleSettingChange('notificationsEnabled', false);
            }
        } else {
            handleSettingChange('notificationsEnabled', enabled);
        }
    };

    const calibrateWorkLocation = () => {
        setGeoStatus("Localisation en cours...");
        navigator.geolocation.getCurrentPosition((pos) => {
            handleSettingChange('workLocation', { lat: pos.coords.latitude, lng: pos.coords.longitude });
            setGeoStatus("Position du bureau enregistrée !");
            setTimeout(() => setGeoStatus(null), 3000);
        }, (err) => {
            setGeoStatus("Erreur : " + err.message);
            setTimeout(() => setGeoStatus(null), 3000);
        });
    };

    const handleWriteNfc = async () => {
        if (!('NDEFReader' in window)) {
            setNfcWriteStatus("NFC non supporté.");
            return;
        }
        
        try {
            setNfcWriting(true);
            setNfcWriteStatus("Approchez le tag...");
            const ndef = new (window as any).NDEFReader();
            await ndef.write("chronotrack-clock-action");
            setNfcWriteStatus("Succès !");
            if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
        } catch (error) {
            setNfcWriteStatus("Erreur d'écriture.");
        } finally {
            setNfcWriting(false);
            setTimeout(() => setNfcWriteStatus(null), 3000);
        }
    };

    return (
        <div className="pb-24">
            <header className="flex items-center p-4 pb-3 sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10 border-b border-border-light dark:border-border-dark">
                <h1 className="text-xl font-bold leading-tight flex-1 text-center text-text-light dark:text-text-dark">Réglages</h1>
            </header>

            <main className="flex flex-col p-4 gap-6">
                <Accordion title="Mes horaires" icon="schedule">
                    <div className="flex flex-col gap-4 px-4 pb-4">
                        {WEEK_DAYS_ORDER.map((day) => (
                             <div key={day}>
                                <p className="font-semibold mb-2 text-sm">{weekDayLabels[day]}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="time" value={localSchedule[day].start1 || ''} onChange={e => setLocalSchedule({...localSchedule, [day]: {...localSchedule[day], start1: e.target.value}})} className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm p-1.5" />
                                    <input type="time" value={localSchedule[day].end2 || localSchedule[day].end1 || ''} onChange={e => setLocalSchedule({...localSchedule, [day]: {...localSchedule[day], end2: e.target.value}})} className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm p-1.5" />
                                </div>
                             </div>
                        ))}
                    </div>
                </Accordion>

                <Accordion title="Automatisations" icon="auto_fix_high" defaultOpen>
                    <div className="flex flex-col gap-4 px-4 pb-4">
                        {/* Notifications */}
                        <div className="flex items-center justify-between p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
                            <div className="flex items-center gap-3">
                                <Icon name="notifications_active" className="text-blue-500 text-2xl" />
                                <div>
                                    <p className="text-sm font-bold">Rappels de pointage</p>
                                    <p className="text-xs text-text-subtle-light">Oubli d'arrivée ou départ</p>
                                </div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={localSettings.notificationsEnabled} 
                                onChange={e => toggleNotifications(e.target.checked)}
                                className="size-6 rounded text-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        {/* Geofencing */}
                        <div className="flex flex-col gap-3 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Icon name="location_on" className="text-emerald-500 text-2xl" />
                                    <div>
                                        <p className="text-sm font-bold">Geofencing (Beta)</p>
                                        <p className="text-xs text-text-subtle-light">Détection automatique du bureau</p>
                                    </div>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={localSettings.geofencingEnabled} 
                                    onChange={e => handleSettingChange('geofencingEnabled', e.target.checked)}
                                    className="size-6 rounded text-emerald-500 focus:ring-emerald-500"
                                />
                            </div>
                            {localSettings.geofencingEnabled && (
                                <button 
                                    onClick={calibrateWorkLocation}
                                    className="mt-2 py-2 px-3 bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm"
                                >
                                    {geoStatus || (localSettings.workLocation ? "Recalibrer ma position" : "Définir ma position de travail")}
                                </button>
                            )}
                        </div>

                        {/* NFC */}
                        <div className="flex flex-col gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Icon name="nfc" className="text-primary text-2xl" />
                                    <div>
                                        <p className="text-sm font-bold">Tag NFC</p>
                                        <p className="text-xs text-text-subtle-light">Pointage par contact physique</p>
                                    </div>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={localSettings.nfcEnabled} 
                                    onChange={e => handleSettingChange('nfcEnabled', e.target.checked)}
                                    className="size-6 rounded text-primary focus:ring-primary"
                                />
                            </div>
                            {localSettings.nfcEnabled && (
                                <div className="mt-2 space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-xs font-semibold text-text-subtle-light">Confirmation manuelle</span>
                                        <input 
                                            type="checkbox" 
                                            checked={localSettings.nfcConfirmRequired} 
                                            onChange={e => handleSettingChange('nfcConfirmRequired', e.target.checked)}
                                            className="size-5 rounded text-primary focus:ring-primary"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleWriteNfc}
                                        disabled={nfcWriting}
                                        className="w-full py-2 px-3 bg-primary text-text-light font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 text-xs"
                                    >
                                        {nfcWriting ? <Icon name="sync" className="animate-spin text-sm" /> : <Icon name="edit_square" className="text-sm" />}
                                        {nfcWriteStatus || "Préparer un nouveau Tag"}
                                    </button>
                                </div>
                            )}
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
                    <p className="text-base font-semibold text-text-light dark:text-text-dark">{title}</p>
                </div>
                <Icon name="expand_more" className="text-text-subtle-light dark:text-text-subtle-dark group-open:rotate-180 transition-transform duration-300"/>
            </summary>
            {children}
        </details>
    );
};

export default SettingsPage;
