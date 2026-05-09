import React from 'react';
import { Radio, Trello, Eye, FileText, ArrowUpRight } from 'lucide-react';
import { Evento, Presupuesto } from '@proyecto/shared/types';

interface WidgetProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  trend?: string;
  color: string;
}

const Widget: React.FC<WidgetProps> = ({ title, value, icon, description, trend, color }) => {
  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20`}>
          {React.cloneElement(icon as React.ReactElement, { className: `w-6 h-6 ${color.replace('bg-', 'text-')}` })}
        </div>
        {trend && (
          <span className="flex items-center text-xs font-bold text-green-500 bg-green-50 dark:bg-green-500/10 px-2 py-1 rounded-full">
            {trend} <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </span>
        )}
      </div>
      <h3 className="text-neutral-500 dark:text-neutral-400 text-sm font-medium mb-1">{title}</h3>
      <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{value}</div>
      <p className="text-xs text-neutral-400 dark:text-neutral-500">{description}</p>
    </div>
  );
};

const Home: React.FC = () => {
  const nextEvent: Evento = {
    id: '1',
    title: 'Live Stream #42',
    status: 'upcoming',
    date: '2026-05-08T20:00:00Z',
    room: 'Room 402'
  };

  const pendingQuotes: Presupuesto[] = [
    { id: '1', clientName: 'Alice', amount: 1200, status: 'pending', date: '2026-05-07' },
    { id: '2', clientName: 'Bob', amount: 800, status: 'pending', date: '2026-05-08' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">Bienvenido de nuevo, Primo</h2>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">Aquí tienes un resumen de lo que está pasando hoy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Widget 
          title="Próximo Evento"
          value={`${nextEvent.room} - Live`}
          icon={<Radio />}
          description="Comienza en 45 minutos"
          color="bg-orange-500"
        />
        <Widget 
          title="Content Board"
          value="12 Pendientes"
          icon={<Trello />}
          description="3 requieren revisión urgente"
          trend="+5 hoy"
          color="bg-blue-500"
        />
        <Widget 
          title="Visualizaciones"
          value="24.5k"
          icon={<Eye />}
          description="Total en el portfolio este mes"
          trend="+12%"
          color="bg-purple-500"
        />
        <Widget 
          title="Presupuestos"
          value={`${pendingQuotes.length} Pendientes`}
          icon={<FileText />}
          description="Esperando firma del cliente"
          color="bg-emerald-500"
        />
      </div>

      {/* Placeholder for more content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 h-96 flex items-center justify-center text-neutral-400">
          Gráfico de Actividad en Vivo
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 h-96 flex items-center justify-center text-neutral-400">
          Últimos Movimientos
        </div>
      </div>
    </div>
  );
};

export default Home;
