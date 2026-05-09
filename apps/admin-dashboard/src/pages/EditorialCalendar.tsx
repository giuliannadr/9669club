import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Star, Film, Instagram, Youtube, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type EventStatus = 'editing' | 'scheduled' | 'published' | 'live' | 'milestone';

interface CalEvent {
  id: string;
  title: string;
  day: number;
  status: EventStatus;
  type: 'xv' | 'social' | 'video' | 'launch' | 'milestone';
}

const STATUS_CONFIG: Record<EventStatus, { label: string; bg: string; text: string; dot: string }> = {
  editing:   { label: 'En Edición',  bg: 'bg-orange-500/10',  text: 'text-orange-400',  dot: 'bg-orange-500' },
  scheduled: { label: 'Programado',  bg: 'bg-blue-500/10',    text: 'text-blue-400',    dot: 'bg-blue-500'   },
  published: { label: 'Publicado',   bg: 'bg-green-500/10',   text: 'text-green-400',   dot: 'bg-green-500'  },
  live:      { label: 'En Vivo',     bg: 'bg-rose-500/10',    text: 'text-rose-400',    dot: 'bg-rose-500'   },
  milestone: { label: 'Hito',        bg: 'bg-purple-500/10',  text: 'text-purple-400',  dot: 'bg-purple-500' },
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  xv:        <Star className="w-3 h-3" />,
  social:    <Instagram className="w-3 h-3" />,
  video:     <Film className="w-3 h-3" />,
  launch:    <Youtube className="w-3 h-3" />,
  milestone: <Flag className="w-3 h-3" />,
};

const MOCK_EVENTS: CalEvent[] = [
  { id: '1',  title: 'XV Valentina — Edición final',  day: 3,  status: 'editing',   type: 'xv' },
  { id: '2',  title: 'Post Reels Instagram',           day: 5,  status: 'scheduled', type: 'social' },
  { id: '3',  title: 'Video Corporativo Montaje',      day: 8,  status: 'editing',   type: 'video' },
  { id: '4',  title: 'Lanzamiento Canal YouTube',      day: 10, status: 'scheduled', type: 'launch' },
  { id: '5',  title: 'XV Valentina — PUBLICADO',       day: 12, status: 'published', type: 'xv' },
  { id: '6',  title: '100 suscriptores 🎉',            day: 12, status: 'milestone', type: 'milestone' },
  { id: '7',  title: 'Live Boda García',               day: 15, status: 'live',      type: 'xv' },
  { id: '8',  title: 'Story Highlights',               day: 17, status: 'scheduled', type: 'social' },
  { id: '9',  title: 'Corto documental',               day: 20, status: 'editing',   type: 'video' },
  { id: '10', title: 'Reel Detrás de cámaras',         day: 22, status: 'scheduled', type: 'social' },
  { id: '11', title: 'Entrega XV Martínez',            day: 25, status: 'scheduled', type: 'xv' },
  { id: '12', title: 'Cierre Trimestre Q2',            day: 30, status: 'milestone', type: 'milestone' },
];

const WEEK_MILESTONES = MOCK_EVENTS.filter(e => e.day >= 8 && e.day <= 15);

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-neutral-800 rounded-lg ${className}`} />
);

const EditorialCalendar: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loading] = useState(false);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = now.getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const eventsForDay = (day: number) => MOCK_EVENTS.filter(e => e.day === day);
  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  return (
    <div className="flex flex-col xl:flex-row gap-8 pb-16">

      {/* Calendar Panel */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Editorial Calendar</h2>
            <p className="text-neutral-500 mt-1">Planificador de contenido y hitos del estudio.</p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">
            <Plus className="w-4 h-4" /> Nuevo Evento
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6 bg-neutral-900/60 backdrop-blur border border-neutral-800 px-6 py-4 rounded-2xl">
          <button onClick={prevMonth} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-bold text-white">{MONTHS[month]} {year}</h3>
          <button onClick={nextMonth} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="text-center text-[11px] font-bold text-neutral-600 uppercase tracking-widest py-2">{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty slots before month start */}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = eventsForDay(day);
              const isToday = isCurrentMonth && day === today;
              const isSelected = selectedDay === day;

              return (
                <motion.div
                  key={day}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`
                    relative min-h-[80px] p-2 rounded-xl border cursor-pointer transition-all duration-200
                    ${isSelected ? 'border-orange-500 bg-orange-500/5' : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/40'}
                    ${isToday ? 'ring-2 ring-orange-500/40' : ''}
                  `}
                >
                  <div className={`text-sm font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-orange-500 text-white' : 'text-neutral-400'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(ev => {
                      const cfg = STATUS_CONFIG[ev.status];
                      return (
                        <div key={ev.id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate flex items-center gap-1 ${cfg.bg} ${cfg.text}`}>
                          {TYPE_ICON[ev.type]}
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] text-neutral-600 font-bold px-1">+{dayEvents.length - 2} más</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Selected Day Detail */}
        <AnimatePresence>
          {selectedDay && selectedEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="mt-6 bg-neutral-900/60 backdrop-blur border border-neutral-800 rounded-2xl p-6"
            >
              <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">
                Eventos — {selectedDay} de {MONTHS[month]}
              </h4>
              <div className="space-y-3">
                {selectedEvents.map(ev => {
                  const cfg = STATUS_CONFIG[ev.status];
                  return (
                    <div key={ev.id} className="flex items-center gap-4 p-3 bg-neutral-800/50 rounded-xl border border-neutral-800">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <span className="flex-1 text-sm font-medium text-white">{ev.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Legend */}
        <div className="mt-6 flex flex-wrap gap-3">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className={`flex items-center gap-2 text-[10px] font-bold px-3 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Hitos de la Semana */}
      <div className="xl:w-72 flex-shrink-0 space-y-6">
        <div className="bg-neutral-900/60 backdrop-blur border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Flag className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-widest">Hitos de la Semana</h3>
          </div>
          <div className="space-y-4">
            {WEEK_MILESTONES.map(ev => {
              const cfg = STATUS_CONFIG[ev.status];
              return (
                <div key={ev.id} className="group flex items-start gap-3 cursor-pointer">
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} group-hover:scale-125 transition-transform`} />
                  <div>
                    <p className="text-xs font-semibold text-white leading-tight">{ev.title}</p>
                    <p className={`text-[10px] font-bold mt-0.5 ${cfg.text}`}>{cfg.label} · Día {ev.day}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-6">
          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-3">Resumen del Mes</p>
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-500">Total eventos</span>
              <span className="font-bold text-white">{MOCK_EVENTS.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-500">En edición</span>
              <span className="font-bold text-orange-400">{MOCK_EVENTS.filter(e => e.status === 'editing').length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-500">Publicados</span>
              <span className="font-bold text-green-400">{MOCK_EVENTS.filter(e => e.status === 'published').length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorialCalendar;
