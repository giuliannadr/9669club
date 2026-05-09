import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { useThemeStore } from '../store/themeStore';
import { useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { theme } = useThemeStore();
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':              return 'Dashboard Overview';
      case '/live-control':  return 'Live Control Console';
      case '/content-board': return 'Content Board';
      case '/calendar':      return 'Editorial Calendar';
      case '/portfolio':     return 'Portfolio Manager';
      case '/billing':       return 'Quotes & Billing';
      case '/settings':      return 'Settings';
      default:               return 'Admin Hub';
    }
  };

  useEffect(() => {
    // Apply theme class to body or html for Tailwind dark mode
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className={`min-h-screen flex bg-white dark:bg-[#0a0a0a] transition-colors duration-300`}>
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header/Top Bar */}
        <header className="h-16 flex items-center justify-between px-8 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-30 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">{getPageTitle()}</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-2" />
            <button className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
              Help
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
