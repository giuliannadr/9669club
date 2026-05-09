import React, { useState } from 'react';
import {
  Plus, Instagram, Youtube, Twitter, Music, MoreHorizontal,
  MessageSquare, Paperclip, AlertCircle, Clock, CheckCircle2,
  Search, SlidersHorizontal, Users, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ──────────────────────────────────────────────────────────────────
type Platform = 'instagram' | 'youtube' | 'tiktok' | 'twitter';
type Priority  = 'low' | 'medium' | 'high' | 'urgent';
type Stage     = 'idea' | 'scripting' | 'production' | 'editing' | 'review';

interface Account {
  id: string;
  name: string;
  handle: string;
  color: string;          // Tailwind bg color
  accent: string;         // border/text accent
  avatar: string;
  platforms: Platform[];
}

interface Task {
  id: string;
  accountId: string;
  title: string;
  description: string;
  stage: Stage;
  priority: Priority;
  platform: Platform;
  dueDate?: string;
  comments: number;
  attachments: number;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────
const ACCOUNTS: Account[] = [
  { id: 'all',    name: 'Todas las cuentas', handle: '',              color: 'bg-neutral-700',   accent: 'border-neutral-500 text-neutral-300', avatar: '👁️', platforms: ['instagram','youtube','tiktok','twitter'] },
  { id: 'xv',     name: 'XV Valentina',      handle: '@xvvalentina',  color: 'bg-rose-600',      accent: 'border-rose-500 text-rose-400',       avatar: '🌸', platforms: ['instagram','tiktok'] },
  { id: 'boda',   name: 'Boda García',       handle: '@bodagarcia',   color: 'bg-blue-600',      accent: 'border-blue-500 text-blue-400',        avatar: '💍', platforms: ['instagram','youtube'] },
  { id: 'studio', name: 'AV Production',     handle: '@avproduction', color: 'bg-orange-600',    accent: 'border-orange-500 text-orange-400',    avatar: '🎬', platforms: ['youtube','instagram','tiktok','twitter'] },
  { id: 'corp',   name: 'Mueblería El Roble',handle: '@roble',        color: 'bg-emerald-700',   accent: 'border-emerald-500 text-emerald-400',  avatar: '🪵', platforms: ['instagram'] },
];

const TASKS: Task[] = [
  { id:'t1',  accountId:'xv',     title:'Reel entrada quinceañera',   description:'Clips del vals + música de fondo',                 stage:'editing',    priority:'urgent', platform:'instagram', dueDate:'2026-05-10', comments:4, attachments:2 },
  { id:'t2',  accountId:'boda',   title:'Teaser trailer boda',         description:'30s con momentos clave del evento',               stage:'production', priority:'high',   platform:'youtube',   dueDate:'2026-05-12', comments:1, attachments:0 },
  { id:'t3',  accountId:'studio', title:'Behind the scenes set',       description:'Vlog del detrás de cámaras del estudio',           stage:'idea',       priority:'low',    platform:'youtube',   dueDate:'2026-05-20', comments:0, attachments:0 },
  { id:'t4',  accountId:'xv',     title:'Carrusel decoración salón',   description:'10 fotos estáticas para feed de Instagram',       stage:'review',     priority:'medium', platform:'instagram', dueDate:'2026-05-09', comments:2, attachments:5 },
  { id:'t5',  accountId:'corp',   title:'Video institucional 60s',     description:'Presentación de productos, corte corporativo',     stage:'scripting',  priority:'medium', platform:'instagram', dueDate:'2026-05-18', comments:3, attachments:1 },
  { id:'t6',  accountId:'studio', title:'Tutorial grabación celular',  description:'Consejos para invitados antes del evento',         stage:'scripting',  priority:'high',   platform:'tiktok',    dueDate:'2026-05-11', comments:0, attachments:0 },
  { id:'t7',  accountId:'boda',   title:'Story series del día',        description:'15 stories del making-of en orden cronológico',   stage:'editing',    priority:'urgent', platform:'instagram', dueDate:'2026-05-09', comments:6, attachments:8 },
  { id:'t8',  accountId:'studio', title:'Anuncio nueva tarifa 2026',   description:'Comunicado oficial en Twitter/X',                 stage:'idea',       priority:'low',    platform:'twitter',   dueDate:'2026-05-25', comments:0, attachments:0 },
  { id:'t9',  accountId:'xv',     title:'TikTok trend lip sync',       description:'Adaptar audio viral a momentos del XV',           stage:'production', priority:'medium', platform:'tiktok',    dueDate:'2026-05-14', comments:1, attachments:0 },
  { id:'t10', accountId:'corp',   title:'Post de producto del mes',    description:'Foto catálogo + copy comercial',                  stage:'review',     priority:'low',    platform:'instagram', dueDate:'2026-05-16', comments:0, attachments:3 },
];

// ─── Constants ───────────────────────────────────────────────────────────────
const STAGES: { id: Stage; label: string }[] = [
  { id:'idea',       label:'Idea'       },
  { id:'scripting',  label:'Guión'      },
  { id:'production', label:'Producción' },
  { id:'editing',    label:'Edición'    },
  { id:'review',     label:'Review'     },
];

const PRIORITY_CFG: Record<Priority, { label:string; classes:string }> = {
  low:    { label:'Baja',    classes:'bg-neutral-800 text-neutral-400' },
  medium: { label:'Media',   classes:'bg-blue-500/10 text-blue-400' },
  high:   { label:'Alta',    classes:'bg-orange-500/10 text-orange-400' },
  urgent: { label:'Urgente', classes:'bg-rose-500/10 text-rose-400' },
};

const PLATFORM_ICON: Record<Platform, React.ReactNode> = {
  instagram: <Instagram className="w-3 h-3" />,
  youtube:   <Youtube className="w-3 h-3" />,
  tiktok:    <Music className="w-3 h-3" />,
  twitter:   <Twitter className="w-3 h-3" />,
};

const PLATFORM_COLOR: Record<Platform, string> = {
  instagram: 'text-rose-400',
  youtube:   'text-red-500',
  tiktok:    'text-cyan-400',
  twitter:   'text-sky-400',
};

// ─── Sub-components ──────────────────────────────────────────────────────────
const AccountBadge: React.FC<{ account: Account; size?: 'sm' | 'md' }> = ({ account, size = 'sm' }) => (
  <div className={`flex items-center gap-1.5 ${size === 'md' ? 'text-xs' : 'text-[10px]'} font-bold`}>
    <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${account.color} text-white text-[9px]`}>{account.avatar}</span>
    <span className="text-neutral-500">{account.name}</span>
  </div>
);

const TaskCard: React.FC<{ task: Task; account: Account }> = ({ task, account }) => {
  const pCfg = PRIORITY_CFG[task.priority];
  const isUrgent = task.priority === 'urgent';
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group relative bg-neutral-900 rounded-2xl border cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-lg overflow-hidden
        ${isUrgent ? 'border-rose-500/30 shadow-rose-500/5' : 'border-neutral-800 hover:border-neutral-700'}`}
    >
      {/* Account color strip */}
      <div className={`h-0.5 w-full ${account.color}`} />

      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${pCfg.classes}`}>{pCfg.label}</span>
            <span className={`text-[9px] font-bold flex items-center gap-0.5 ${PLATFORM_COLOR[task.platform]}`}>
              {PLATFORM_ICON[task.platform]}
            </span>
          </div>
          <button className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-white transition-all p-0.5">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        <h4 className="text-sm font-semibold text-white leading-snug mb-1">{task.title}</h4>
        <p className="text-[11px] text-neutral-500 line-clamp-2 mb-3">{task.description}</p>

        {/* Account badge (shown in "all" view) */}
        <AccountBadge account={account} />

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-800">
          {task.dueDate && (
            <div className={`flex items-center gap-1 text-[10px] font-bold ${isOverdue ? 'text-rose-400' : 'text-neutral-600'}`}>
              {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {task.dueDate}
            </div>
          )}
          <div className="flex items-center gap-2.5 ml-auto text-neutral-600">
            {task.comments > 0 && (
              <span className="flex items-center gap-1 text-[10px]"><MessageSquare className="w-3 h-3" />{task.comments}</span>
            )}
            {task.attachments > 0 && (
              <span className="flex items-center gap-1 text-[10px]"><Paperclip className="w-3 h-3" />{task.attachments}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const KanbanColumn: React.FC<{
  stage: { id: Stage; label: string };
  tasks: Task[];
  accounts: Account[];
}> = ({ stage, tasks, accounts }) => {
  const getAccount = (id: string) => accounts.find(a => a.id === id) ?? accounts[0];

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-neutral-200">{stage.label}</span>
          <span className="text-[10px] font-black bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">{tasks.length}</span>
        </div>
        <button className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-600 hover:text-white transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-[200px]">
        <AnimatePresence>
          {tasks.length === 0 ? (
            <div className="border-2 border-dashed border-neutral-800 rounded-2xl flex items-center justify-center h-24 text-neutral-700 text-xs font-bold">
              Sin tareas
            </div>
          ) : (
            tasks.map(task => (
              <TaskCard key={task.id} task={task} account={getAccount(task.accountId)} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const ContentBoard: React.FC = () => {
  const [activeAccount, setActiveAccount] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');

  const filteredTasks = TASKS.filter(t => {
    if (activeAccount !== 'all' && t.accountId !== activeAccount) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const urgentCount = TASKS.filter(t => t.priority === 'urgent').length;
  const pendingReview = TASKS.filter(t => t.stage === 'review').length;

  return (
    <div className="flex flex-col h-full pb-8">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Content Board
            {urgentCount > 0 && (
              <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {urgentCount} urgentes
              </span>
            )}
          </h2>
          <p className="text-neutral-500 mt-1">Gestión de contenido por cuenta y plataforma.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 self-start md:self-auto">
          <Plus className="w-4 h-4" /> Nueva Tarea
        </button>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label:'Total tareas',      value: TASKS.length,      icon:<Users className="w-4 h-4 text-neutral-400" />,   cls:'text-white' },
          { label:'Urgentes',          value: urgentCount,        icon:<AlertCircle className="w-4 h-4 text-rose-400" />, cls:'text-rose-400' },
          { label:'En Review',         value: pendingReview,      icon:<Star className="w-4 h-4 text-orange-400" />,     cls:'text-orange-400' },
          { label:'Cuentas activas',   value: ACCOUNTS.length-1,  icon:<CheckCircle2 className="w-4 h-4 text-green-400" />, cls:'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-neutral-900/60 border border-neutral-800 rounded-xl px-4 py-3 flex items-center gap-3">
            {s.icon}
            <div>
              <p className={`text-xl font-black ${s.cls}`}>{s.value}</p>
              <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Account Switcher ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {ACCOUNTS.map(acc => {
          const count = acc.id === 'all' ? TASKS.length : TASKS.filter(t => t.accountId === acc.id).length;
          const isActive = activeAccount === acc.id;
          return (
            <button
              key={acc.id}
              onClick={() => setActiveAccount(acc.id)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl font-bold text-xs border transition-all duration-200 flex-shrink-0
                ${isActive
                  ? 'bg-neutral-800 border-neutral-600 text-white shadow-inner'
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300'
                }`}
            >
              <span className={`w-5 h-5 rounded-full ${acc.color} flex items-center justify-center text-[10px]`}>{acc.avatar}</span>
              <span>{acc.name}</span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-neutral-700 text-white' : 'bg-neutral-800 text-neutral-600'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Filters Row ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar tarea..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-orange-500/40 transition-colors w-48"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
          {(['all', 'urgent', 'high', 'medium', 'low'] as const).map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border capitalize
                ${filterPriority === p
                  ? p === 'all' ? 'bg-neutral-700 text-white border-neutral-600'
                    : p === 'urgent' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : p === 'high'   ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                    : p === 'medium' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  : 'bg-neutral-900 text-neutral-600 border-neutral-800 hover:border-neutral-700'
                }`}
            >
              {p === 'all' ? 'Todas' : PRIORITY_CFG[p].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Kanban Board ── */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-5 h-full" style={{ minWidth: 'max-content' }}>
          {STAGES.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              tasks={filteredTasks.filter(t => t.stage === stage.id)}
              accounts={ACCOUNTS}
            />
          ))}
        </div>
      </div>

      {/* Platform legend */}
      <div className="flex flex-wrap gap-4 mt-2 pt-4 border-t border-neutral-900">
        {(['instagram','youtube','tiktok','twitter'] as Platform[]).map(p => (
          <div key={p} className={`flex items-center gap-1.5 text-[10px] font-bold ${PLATFORM_COLOR[p]}`}>
            {PLATFORM_ICON[p]} {p.charAt(0).toUpperCase() + p.slice(1)}
          </div>
        ))}
        <div className="ml-auto flex flex-wrap gap-3">
          {ACCOUNTS.filter(a => a.id !== 'all').map(a => (
            <div key={a.id} className="flex items-center gap-1.5 text-[10px] text-neutral-600 font-bold">
              <div className={`w-2 h-2 rounded-full ${a.color}`} /> {a.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContentBoard;
