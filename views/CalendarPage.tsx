


import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { getMonthDays, dateToISODateString, formatSimpleDuration, formatDuration } from '../utils/dateUtils';
import Icon from '../components/Icon';
import { DayInfo } from '../types';

interface CalendarPageProps {
  onSelectDay: (date: string) => void;
}

const StatCard: React.FC<{label: string, value: string, valueColor?: string}> = ({label, value, valueColor = 'text-text-light dark:text-text-dark'}) => (
     <div className="flex flex-1 flex-col gap-1 rounded-lg p-3 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-center">
        <p className="text-xs font-medium text-text-subtle-light dark:text-text-subtle-dark">{label}</p>
        <p className={`tracking-tight text-xl font-bold ${valueColor}`}>{value}</p>
    </div>
);

// New component for the PDF report structure. It's only for layout and will be hidden in the UI.
const MonthlyReportPDF: React.FC<{ monthInfo: DayInfo[], monthlyStats: any, monthName: string }> = ({ monthInfo, monthlyStats, monthName }) => {
    
    const toDecimalHours = (minutes: number) => (minutes / 60).toFixed(2);

    return (
        <div>
            <header>
                <h1>Récapitulatif d'Activité Mensuel</h1>
                <h2>{monthName}</h2>
            </header>
            
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Jour</th>
                        <th>Pointages</th>
                        <th>Travaillé</th>
                        <th>Théorique</th>
                        <th>Solde</th>
                        <th>Absence/Note</th>
                    </tr>
                </thead>
                <tbody>
                    {monthInfo.map(dayInfo => {
                        const logs = dayInfo.entry?.logs?.slice().sort((a, b) => a.time.localeCompare(b.time)) || [];
                        const ins = logs.filter(l => l.type === 'in');
                        const outs = logs.filter(l => l.type === 'out');
                        const pointages = ins.map((log, index) => `${log.time} - ${outs[index]?.time || '...'}`).join(' / ');

                        let absenceType = '';
                        if (dayInfo.absence) {
                            absenceType = dayInfo.absence.type;
                        } else if (dayInfo.isHoliday) {
                            absenceType = 'Jour férié';
                        }
                        const note = dayInfo.entry?.note;

                        return (
                            <tr key={dayInfo.date}>
                                <td>{new Date(dayInfo.date + 'T00:00:00').toLocaleDateString('fr-FR')}</td>
                                <td>{new Date(dayInfo.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long' })}</td>
                                <td>{pointages || '-'}</td>
                                <td>{formatSimpleDuration(dayInfo.workedMinutes)}</td>
                                <td>{formatSimpleDuration(dayInfo.theoreticalMinutes)}</td>
                                <td>{formatDuration(dayInfo.balanceMinutes)}</td>
                                <td>{`${absenceType}${note ? ` (${note})` : ''}`}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <table className="summary-table">
                <tbody>
                    <tr>
                        <td>Total Heures Travaillées</td>
                        <td>{toDecimalHours(monthlyStats.worked)}h ({formatSimpleDuration(monthlyStats.worked)})</td>
                    </tr>
                     <tr>
                        <td>Total Heures Théoriques</td>
                        <td>{toDecimalHours(monthlyStats.theoretical)}h ({formatSimpleDuration(monthlyStats.theoretical)})</td>
                    </tr>
                     <tr>
                        <td>Solde Mensuel</td>
                        <td>{toDecimalHours(monthlyStats.balance)}h ({formatDuration(monthlyStats.balance)})</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};


const CalendarPage: React.FC<CalendarPageProps> = ({ onSelectDay }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const { getDayInfo } = useData();
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    const monthDays = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth]);
    const monthInfo = useMemo(() => monthDays.map(d => getDayInfo(dateToISODateString(d))), [monthDays, getDayInfo]);

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    // Adjust for Monday start: Sunday is 0, we want it to be 6.
    const startOffset = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);
    
    const monthlyStats = useMemo(() => {
        return monthInfo.reduce((acc, day) => {
            acc.worked += day.workedMinutes;
            if (day.isHoliday) {
                acc.worked += day.theoreticalMinutes;
            }

            if (!day.isWeekend && !day.isHoliday && !day.absence) {
                acc.theoretical += day.theoreticalMinutes;
            }

            acc.balance += day.balanceMinutes;

            return acc;
        }, { worked: 0, theoretical: 0, balance: 0 });
    }, [monthInfo]);


    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };
    
    const handleExportCSV = () => {
        setIsExportMenuOpen(false);
        const monthNameForFile = currentDate.toLocaleDateString('fr-FR', { month: 'long' });
        const year = currentDate.getFullYear();
        const fileName = `Recapitulatif_Heures_${monthNameForFile}_${year}.csv`;

        const headers = [
            "Date", "Jour", "Heure Arrivée 1", "Heure Départ 1", "Heure Arrivée 2", "Heure Départ 2",
            "Temps Travaillé (h)", "Temps Théorique (h)", "Solde (h)", "Type d'absence", "Note"
        ];

        const rows = monthInfo.map(dayInfo => {
            const date = dayInfo.date;
            const dayOfWeek = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long' });

            const logs = dayInfo.entry?.logs?.slice().sort((a, b) => a.time.localeCompare(b.time)) || [];
            const ins = logs.filter(l => l.type === 'in');
            const outs = logs.filter(l => l.type === 'out');

            const arrival1 = ins[0]?.time || '';
            const departure1 = outs[0]?.time || '';
            const arrival2 = ins[1]?.time || '';
            const departure2 = outs[1]?.time || '';

            const toDecimalHours = (minutes: number) => (minutes / 60).toFixed(2);

            const workedHours = toDecimalHours(dayInfo.workedMinutes);
            const theoreticalHours = toDecimalHours(dayInfo.theoreticalMinutes);
            const balanceHours = toDecimalHours(dayInfo.balanceMinutes);

            let absenceType = '';
            if (dayInfo.absence) {
                absenceType = dayInfo.absence.type;
            } else if (dayInfo.isHoliday) {
                absenceType = 'Jour férié';
            }

            const note = dayInfo.entry?.note?.replace(/"/g, '""') || '';

            return [
                date, `"${dayOfWeek}"`, arrival1, departure1, arrival2, departure2,
                workedHours, theoreticalHours, balanceHours, `"${absenceType}"`, `"${note}"`
            ].join(',');
        });
        
        const summaryHeader = ["", "", "", "", "", "Total travaillé (h)", "Total théorique (h)", "Solde mensuel (h)"].join(',');
        const summaryValues = [
             "", "", "", "", "",
            (monthlyStats.worked / 60).toFixed(2),
            (monthlyStats.theoretical / 60).toFixed(2),
            (monthlyStats.balance / 60).toFixed(2)
        ].join(',');

        const csvContent = [
            headers.join(','),
            ...rows,
            "", 
            summaryHeader,
            summaryValues
        ].join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleExportPDF = () => {
        setIsExportMenuOpen(false);
        window.print();
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const getDayColor = (dayInfo: DayInfo) => {
        if (dayInfo.absence) {
            return 'bg-info text-white';
        }
        if (dayInfo.isHoliday) {
            return 'bg-warning text-text-light';
        }
        if (dayInfo.isWeekend) {
            return 'bg-gray-200 dark:bg-gray-700 text-text-subtle-light dark:text-text-subtle-dark';
        }
        if (dayInfo.workedMinutes > 0) {
            if (dayInfo.balanceMinutes >= 0) return 'bg-positive text-white';
            return 'bg-orange-400 text-white';
        }
        if(new Date(dayInfo.date) < new Date(dateToISODateString(new Date()))){
            return 'bg-negative text-white';
        }
        return 'bg-card-light dark:bg-card-dark';
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between pb-4">
                <div className="flex-1 flex justify-start">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Icon name="chevron_left" />
                    </button>
                </div>
                <h2 className="text-lg font-bold text-center">{monthName}</h2>
                <div className="flex-1 flex justify-end items-center relative" ref={exportMenuRef}>
                     <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Icon name="chevron_right" />
                    </button>
                    <button onClick={() => setIsExportMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Options d'exportation">
                        <Icon name="download" />
                    </button>
                     {isExportMenuOpen && (
                        <div className="absolute top-10 right-0 z-20 w-48 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg">
                            <button onClick={handleExportCSV} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg">Exporter en CSV</button>
                            <button onClick={handleExportPDF} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg">Exporter en PDF</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-text-subtle-light dark:text-text-subtle-dark mb-2">
                {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {monthInfo.map(dayInfo => (
                    <button
                        key={dayInfo.date}
                        onClick={() => !dayInfo.isWeekend && onSelectDay(dayInfo.date)}
                        className={`flex items-center justify-center size-10 rounded-lg text-sm font-medium transition-transform active:scale-95 ${getDayColor(dayInfo)}`}
                    >
                        {new Date(dayInfo.date + 'T00:00:00').getDate()}
                    </button>
                ))}
            </div>
            
            <section className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Heures travaillées" value={formatSimpleDuration(monthlyStats.worked)} />
                <StatCard label="Objectif du mois" value={formatSimpleDuration(monthlyStats.theoretical)} />
                <StatCard label="Solde du mois" value={formatDuration(monthlyStats.balance)} valueColor={monthlyStats.balance >= 0 ? 'text-positive' : 'text-negative'} />
            </section>
            
            <div className="px-4 pt-6">
                <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    <LegendItem color="bg-positive" label="Journée complète" />
                    <LegendItem color="bg-orange-400" label="Journée partielle" />
                    <LegendItem color="bg-negative" label="Absence" />
                    <LegendItem color="bg-info" label="Congé/RTT" />
                    <LegendItem color="bg-warning" label="Férié" />
                    <LegendItem color="bg-gray-200 dark:bg-gray-700" label="Weekend" />
                </div>
            </div>
            
            {/* The PDF report component is rendered here but hidden by default via CSS. It becomes visible only for printing. */}
            <div id="pdf-report-container" style={{ display: 'none' }}>
                <MonthlyReportPDF monthInfo={monthInfo} monthlyStats={monthlyStats} monthName={monthName} />
            </div>
        </div>
    );
};

const LegendItem: React.FC<{color: string, label: string}> = ({color, label}) => (
     <div className="flex items-center gap-2">
        <div className={`size-3 rounded-full ${color}`}></div>
        <span>{label}</span>
    </div>
)

export default CalendarPage;