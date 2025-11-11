
import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import { useData } from '../contexts/DataContext';
import { AbsenceType } from '../types';
import { dateToISODateString } from '../utils/dateUtils';

const AbsencePage: React.FC = () => {
  const { addAbsence, settings } = useData();
  const [absenceType, setAbsenceType] = useState<AbsenceType>('RTT');
  const [startDate, setStartDate] = useState(dateToISODateString(new Date()));
  const [endDate, setEndDate] = useState(dateToISODateString(new Date()));
  const [isSingleDay, setIsSingleDay] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isSingleDay) {
      setEndDate(startDate);
    }
  }, [startDate, isSingleDay]);

  const handleAbsenceTypeChange = (type: AbsenceType) => {
    setAbsenceType(type);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAbsence({
        type: absenceType,
        startDate: startDate,
        endDate: endDate,
        note: note,
    });
    // Maybe navigate away or show success message. For now, just log.
    console.log('Absence added');
  };
  
  const calculateDuration = () => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      let count = 0;
      const curDate = new Date(start.getTime());
      while (curDate <= end) {
          const dayOfWeek = curDate.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude weekends
              count++;
          }
          curDate.setDate(curDate.getDate() + 1);
      }
      return count;
  }
  
  const durationDays = calculateDuration();
  const impactHours = absenceType === 'RTT' ? durationDays * settings.rttEquivalent : 0;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center p-4 pb-2 justify-between sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10">
        <div className="w-10"></div>
        <h1 className="text-lg font-bold flex-1 text-center">Déclarer une Absence</h1>
        <div className="w-10"></div>
      </header>
      
      <main className="flex-1 px-4 py-2">
        <form onSubmit={handleSubmit}>
          <section className="mb-6">
            <h2 className="text-xl font-bold pb-3 pt-4">Type d'absence</h2>
            <div className="flex h-12 flex-1 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-800 p-1 space-x-1">
              {(['Congés payés', 'RTT', 'Maladie'] as AbsenceType[]).map(type => (
                <button
                  type="button"
                  key={type}
                  onClick={() => handleAbsenceTypeChange(type)}
                  className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 text-sm font-semibold transition-all ${
                    absenceType === type ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : ''
                  }`}
                >
                  <span className="truncate">{type}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold pb-3 pt-2">Sélectionner les dates</h2>
             <div className="flex w-full flex-wrap items-end gap-4">
               <label className="flex flex-col min-w-40 flex-1 relative">
                <p className="text-sm font-medium pb-2">Date de début</p>
                <input value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 h-14 p-3.5 text-base" type="date"/>
               </label>
               {!isSingleDay && (
                 <label className="flex flex-col min-w-40 flex-1 relative">
                  <p className="text-sm font-medium pb-2">Date de fin</p>
                  <input value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 h-14 p-3.5 text-base" type="date"/>
                 </label>
               )}
            </div>
             <div className="mt-4 flex items-center justify-between rounded-lg bg-white dark:bg-gray-800 p-3 shadow-sm border border-border-light dark:border-border-dark">
                <label className="text-sm font-medium" htmlFor="single-day">Jour unique</label>
                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input checked={isSingleDay} onChange={() => setIsSingleDay(!isSingleDay)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white dark:bg-gray-600 border-4 appearance-none cursor-pointer border-gray-300 dark:border-gray-500 checked:right-0 checked:border-primary checked:bg-primary" id="single-day" name="single-day" type="checkbox"/>
                    <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer" htmlFor="single-day"></label>
                </div>
            </div>
          </section>
          
           <section className="mb-6">
            <div className="space-y-3 rounded-lg bg-primary/10 dark:bg-primary/20 p-4">
                <div className="flex justify-between items-center">
                    <p className="text-base font-medium">Durée totale</p>
                    <p className="text-base font-bold text-primary">{durationDays} jour{durationDays > 1 ? 's' : ''}</p>
                </div>
                <div className="flex justify-between items-center">
                    <p className="text-base font-medium">Impact sur le solde</p>
                    <p className="text-base font-bold text-primary">-{impactHours.toFixed(2)} heures</p>
                </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold leading-tight pb-3 pt-2">Note (optionnel)</h2>
            <textarea value={note} onChange={e => setNote(e.target.value)} className="form-textarea flex w-full min-w-0 flex-1 resize-y overflow-hidden rounded-lg focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-3.5 text-base placeholder:text-gray-400" placeholder="Ex: Rendez-vous médical" rows={4}></textarea>
          </section>
        </form>
      </main>
      
      <footer className="p-4 sticky bottom-20 bg-background-light dark:bg-background-dark">
        <button type="submit" onClick={handleSubmit} className="w-full rounded-xl bg-primary py-4 text-center text-base font-bold text-text-light shadow-lg shadow-primary/30 hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/40 transition-all">Confirmer l'absence</button>
      </footer>
    </div>
  );
};

export default AbsencePage;
