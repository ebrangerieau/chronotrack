
import React from 'react';
import Icon from './Icon';
import { Page } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  navigate: (page: Page) => void;
}

const NavItem: React.FC<{ icon: string; label: string; isActive: boolean; onClick: () => void;}> = ({ icon, label, isActive, onClick }) => {
  const activeClasses = 'text-primary';
  const inactiveClasses = 'text-text-subtle-light dark:text-text-subtle-dark';
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}>
      <Icon name={icon} className={`text-2xl transition-all duration-200 ${isActive ? 'scale-110' : 'scale-100'}`} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};


const Layout: React.FC<LayoutProps> = ({ children, currentPage, navigate }) => {
  return (
    <div className="flex flex-col min-h-screen font-display text-text-light dark:text-text-dark">
      <main className="flex-grow pb-24">
        {children}
      </main>
      <footer className="fixed bottom-0 left-0 right-0 z-20 bg-card-light/80 dark:bg-card-dark/80 backdrop-blur-lg border-t border-border-light dark:border-border-dark">
        <div className="flex justify-around items-center h-16 px-2">
          <NavItem icon="home" label="Accueil" isActive={currentPage === 'home'} onClick={() => navigate('home')} />
          <NavItem icon="history" label="Historique" isActive={currentPage === 'history' || currentPage === 'dayDetail'} onClick={() => navigate('history')} />
          
          <div className="relative -top-6">
            <button 
                onClick={() => navigate('absence')}
                className="flex items-center justify-center size-16 bg-primary rounded-full shadow-lg shadow-primary/30 text-text-light hover:bg-primary-dark transition-transform duration-200 active:scale-95">
              <Icon name="add" className="text-4xl" />
            </button>
          </div>
          
          <NavItem icon="calendar_month" label="Calendrier" isActive={currentPage === 'calendar'} onClick={() => navigate('calendar')} />
          <NavItem icon="settings" label="Réglages" isActive={currentPage === 'settings'} onClick={() => navigate('settings')} />
        </div>
      </footer>
    </div>
  );
};

export default Layout;
