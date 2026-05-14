import React, { useState } from 'react';
import { 
  LayoutDashboard,
  Radio,
  Trello,
  Calendar,
  Video,
  FileText,
  Settings,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  active?: boolean;
  collapsed?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, to, active, collapsed }) => {
  return (
    <Link to={to} className={`
      flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200
      ${active 
        ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md' 
        : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'}
    `}>
      <div className="flex-shrink-0">{icon}</div>
      {!collapsed && <span className="font-medium text-sm">{label}</span>}
      {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500" />}
    </Link>
  );
};

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // For mobile drawer
  const location = useLocation();

  const navGroups = [
    {
      title: 'OPERACIONES EN VIVO',
      items: [
        { icon: <Radio className="w-5 h-5" />, label: 'Live Control', to: '/live-control' },
      ]
    },
    {
      title: 'ESTRATEGIA DE CONTENIDO',
      items: [
        { icon: <Trello className="w-5 h-5" />, label: 'Content Board', to: '/content-board' },
        { icon: <Calendar className="w-5 h-5" />, label: 'Editorial Calendar', to: '/calendar' },
      ]
    },
    {
      title: 'NEGOCIO Y ACTIVOS',
      items: [
        { icon: <Video className="w-5 h-5" />, label: 'Portfolio Manager', to: '/portfolio' },
        { icon: <FileText className="w-5 h-5" />, label: 'Quotes & Billing', to: '/billing' },
      ]
    },
    {
      title: 'CONFIGURACIÓN',
      items: [
        { icon: <Settings className="w-5 h-5" />, label: 'Settings', to: '/settings' },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-neutral-900 rounded-lg shadow-sm"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        ${isCollapsed ? 'w-20' : 'w-72'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col h-screen bg-[#FDFCFB] dark:bg-[#0a0a0a] border-r border-neutral-200 dark:border-neutral-800
        transition-all duration-300 ease-in-out
      `}>
        {/* Header */}
        <Link to="/" className="p-6 flex items-center justify-between hover:opacity-80 transition-opacity">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-bold text-xl tracking-tight text-neutral-900 dark:text-white">ADMIN HUB</span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center mx-auto">
              <LayoutDashboard className="w-5 h-5 text-white dark:text-black" />
            </div>
          )}
        </Link>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 space-y-8 py-4">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-2">
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest uppercase">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item, itemIdx) => (
                  <SidebarItem 
                    key={itemIdx} 
                    {...item} 
                    active={location.pathname === item.to}
                    collapsed={isCollapsed} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* User Profile */}
        <div className="p-4 mt-auto border-t border-neutral-200 dark:border-neutral-800">
          <div className={`
            flex items-center gap-3 p-2 rounded-xl transition-colors
            ${isCollapsed ? 'justify-center' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer'}
          `}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-400 to-rose-400 flex items-center justify-center text-white font-bold">
              MM
            </div>
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">Matias Morales</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">matiasmorales@gmail.com</p>
              </div>
            )}
            {!isCollapsed && <ChevronRight className="w-4 h-4 text-neutral-400" />}
          </div>
        </div>

        {/* Collapse Toggle (Desktop) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full items-center justify-center shadow-sm z-50 text-neutral-500 hover:text-neutral-900"
        >
          <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
