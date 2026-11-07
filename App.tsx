
import React, { useState, useEffect, useRef } from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './views/HomePage';
import HistoryPage from './views/HistoryPage';
import CalendarPage from './views/CalendarPage';
import SettingsPage from './views/SettingsPage';
import AbsencePage from './views/AbsencePage';
import DayDetailPage from './views/DayDetailPage';
import AuthPage from './views/AuthPage';
import WidgetPage from './views/WidgetPage';
import Layout from './components/Layout';
import Icon from './components/Icon';
import { Page, TimeLog } from './types';
import { dateToISODateString } from './utils/dateUtils';

// Raccourcis du manifeste : /?action=clock-in et /?action=clock-out
const readShortcutAction = (): TimeLog['type'] | null => {
  const action = new URLSearchParams(window.location.search).get('action');
  return action === 'clock-in' ? 'in' : action === 'clock-out' ? 'out' : null;
};

const AppContent: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { dataLoading, settings, performClockAction } = useData();
  const [page, setPage] = useState<Page>(() =>
    new URLSearchParams(window.location.search).get('view') === 'widget' ? 'widget' : 'home'
  );
  const [activeDay, setActiveDay] = useState<string | null>(null);
  // Consommée une seule fois : performClockAction change d'identité à chaque pointage,
  // l'effet qui l'exécute se relance donc et ne doit pas pointer de nouveau.
  const pendingShortcutAction = useRef(readShortcutAction());

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
        const isDark =
            settings.display.theme === 'dark' ||
            (settings.display.theme === 'system' && mediaQuery.matches);
        
        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    };

    applyTheme();

    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [settings.display.theme]);

  useEffect(() => {
    const requested = pendingShortcutAction.current;
    if (!requested || !isAuthenticated || dataLoading) return;
    pendingShortcutAction.current = null;

    // Nettoyer l'URL avant d'écrire : hors ligne, la promesse de setDoc ne se résout jamais.
    const url = new URL(window.location.href);
    url.searchParams.delete('action');
    window.history.replaceState(null, '', url);

    performClockAction(requested).catch((error) => {
      console.error('Pointage par raccourci impossible :', error);
    });
  }, [isAuthenticated, dataLoading, performClockAction]);


  const handleNavigate = (newPage: Page) => {
    setActiveDay(null);
    setPage(newPage);
  };
  
  const handleSelectDay = (date: string) => {
    setActiveDay(date);
    setPage('dayDetail');
  };

  const handleChangeDay = (offset: number) => {
    if (!activeDay) return;
    
    const currentDate = new Date(activeDay + 'T00:00:00'); // Prevent timezone issues by setting time to midnight
    currentDate.setDate(currentDate.getDate() + offset);
    
    const newDateString = dateToISODateString(currentDate);
    setActiveDay(newDateString);
  };

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <HomePage />;
      case 'history':
        return <HistoryPage onSelectDay={handleSelectDay} />;
      case 'calendar':
        return <CalendarPage onSelectDay={handleSelectDay} />;
      case 'settings':
        return <SettingsPage />;
      case 'absence':
        return <AbsencePage />;
      case 'widget':
        return <WidgetPage />;
       case 'dayDetail':
        return activeDay ? <DayDetailPage date={activeDay} onBack={() => setPage('history')} onChangeDate={handleChangeDay} /> : <HistoryPage onSelectDay={handleSelectDay} />;
      default:
        return <HomePage />;
    }
  };
  
  if (authLoading || (isAuthenticated && dataLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <Icon name="progress_activity" className="text-4xl text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }
  
  if (page === 'widget') {
    return renderPage();
  }

  return (
      <Layout currentPage={page} navigate={handleNavigate}>
        {renderPage()}
      </Layout>
  );
};


const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
};

export default App;