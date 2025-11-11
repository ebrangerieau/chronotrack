
import React, { useState, useEffect } from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import HomePage from './views/HomePage';
import HistoryPage from './views/HistoryPage';
import CalendarPage from './views/CalendarPage';
import SettingsPage from './views/SettingsPage';
import AbsencePage from './views/AbsencePage';
import DayDetailPage from './views/DayDetailPage';
import Layout from './components/Layout';
import { Page } from './types';

const ThemeManager: React.FC = () => {
  const { settings } = useData();
  const theme = settings.display.theme;

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyTheme(e.matches);
      }
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    if (theme === 'dark') {
      applyTheme(true);
    } else if (theme === 'light') {
      applyTheme(false);
    } else { // 'system'
      applyTheme(mediaQuery.matches);
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    }

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  return null; // This component does not render anything visible
};


const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const [activeDay, setActiveDay] = useState<string | null>(null);

  const handleNavigate = (newPage: Page) => {
    setActiveDay(null);
    setPage(newPage);
  };
  
  const handleSelectDay = (date: string) => {
    setActiveDay(date);
    setPage('dayDetail');
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
       case 'dayDetail':
        return activeDay ? <DayDetailPage date={activeDay} onBack={() => setPage('history')} /> : <HistoryPage onSelectDay={handleSelectDay} />;
      default:
        return <HomePage />;
    }
  };

  return (
    <DataProvider>
      <ThemeManager />
      <Layout currentPage={page} navigate={handleNavigate}>
        {renderPage()}
      </Layout>
    </DataProvider>
  );
};

export default App;
