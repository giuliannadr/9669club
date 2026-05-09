import React, { useState } from 'react';
import { DollarSign, Clock, Zap, FileText, ChevronRight, Plus, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

type PaymentStatus = 'pending' | 'signed' | 'paid' | 'rejected';

interface Quote {
  id: string;
  clientName: string;
  eventType: string;
  amount: number;
  deposit: number;
  status: PaymentStatus;
  date: string;
  services: string[];
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pendiente', bg: 'bg-orange-500/10', text: 'text-orange-400', icon: <Clock className="w-3.5 h-3.5" /> },
  signed:   { label: 'Señado',    bg: 'bg-blue-500/10',   text: 'text-blue-400',   icon: <CheckCircle className="w-3.5 h-3.5" /> },
  paid:     { label: 'Pagado',    bg: 'bg-green-500/10',  text: 'text-green-400',  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected: { label: 'Rechazado', bg: 'bg-red-500/10',    text: 'text-red-400',    icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

const MOCK_QUOTES: Quote[] = [
  { id: 'Q-001', clientName: 'Familia Valentina R.', eventType: 'XV Años',       amount: 180000, deposit: 60000, status: 'paid',     date: '2026-05-01', services: ['Cobertura Full', 'Edición Premium', 'Live Stream 4K', 'Álbum Digital'] },
  { id: 'Q-002', clientName: 'Familia García',        eventType: 'Boda',           amount: 250000, deposit: 80000, status: 'signed',   date: '2026-05-15', services: ['Cobertura Full', 'Drone', 'Edición Cinematográfica', 'Live Stream'] },
  { id: 'Q-003', clientName: 'Mueblería El Roble',   eventType: 'Video Corpo.',   amount: 95000,  deposit: 0,     status: 'pending',  date: '2026-05-20', services: ['Video Institucional', 'Edición Básica'] },
  { id: 'Q-004', clientName: 'Ana Torres',            eventType: 'XV Años',       amount: 150000, deposit: 0,     status: 'pending',  date: '2026-05-28', services: ['Cobertura Estándar', 'Edición Standard', 'Álbum Digital'] },
  { id: 'Q-005', clientName: 'Familia Martínez',      eventType: 'XV Años',       amount: 200000, deposit: 70000, status: 'signed',   date: '2026-06-05', services: ['Cobertura Full', 'Live Stream', 'Edición Premium'] },
];

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-neutral-800 rounded-2xl ${className}`} />
);

const KPICard: React.FC<{ label: string; value: string; sub: string; icon: React.ReactNode; color: string }> = ({ label, value, sub, icon, color }) => (
  <div className={`bg-neutral-900/60 backdrop-blur border border-neutral-800 rounded-2xl p-6`}>
    <div className={`inline-flex p-2.5 rounded-xl mb-4 ${color}`}>{icon}</div>
    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
    <p className="text-3xl font-black text-white tracking-tight">{value}</p>
    <p className="text-xs text-neutral-500 mt-1">{sub}</p>
  </div>
);

const QuotesBilling: React.FC = () => {
  const [loading] = useState(false);

  const totalPaid = MOCK_QUOTES.filter(q => q.status === 'paid').reduce((s, q) => s + q.amount, 0);
  const totalPending = MOCK_QUOTES.filter(q => q.status === 'pending').reduce((s, q) => s + q.amount, 0);
  const totalSigned = MOCK_QUOTES.filter(q => q.status === 'signed').reduce((s, q) => s + q.deposit, 0);
  const activeEvents = MOCK_QUOTES.filter(q => q.status !== 'paid' && q.status !== 'rejected').length;

  const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`;

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Quotes & Billing</h2>
          <p className="text-neutral-500 mt-1">Presupuestos, cobros y estado financiero del estudio.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">
          <Plus className="w-4 h-4" /> Nuevo Presupuesto
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
        <KPICard
          label="Ingresos del Mes"
          value={fmt(totalPaid)}
          sub="Eventos cobrados completo"
          icon={<DollarSign className="w-5 h-5 text-green-400" />}
          color="bg-green-500/10"
        />
        <KPICard
          label="Pendientes de Cobro"
          value={fmt(totalPending)}
          sub="Sin señar aún"
          icon={<Clock className="w-5 h-5 text-orange-400" />}
          color="bg-orange-500/10"
        />
        <KPICard
          label="Señas Recibidas"
          value={fmt(totalSigned)}
          sub="Reservas confirmadas"
          icon={<TrendingUp className="w-5 h-5 text-blue-400" />}
          color="bg-blue-500/10"
        />
        <KPICard
          label="Eventos Activos"
          value={String(activeEvents)}
          sub="En agenda este mes"
          icon={<Zap className="w-5 h-5 text-purple-400" />}
          color="bg-purple-500/10"
        />
      </div>

      {/* Quote Cards */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {MOCK_QUOTES.map((quote, i) => {
            const cfg = STATUS_CONFIG[quote.status];
            const remaining = quote.amount - quote.deposit;
            const pct = Math.round((quote.deposit / quote.amount) * 100);

            return (
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-neutral-900/60 backdrop-blur border border-neutral-800 hover:border-neutral-700 rounded-2xl p-6 transition-all group"
              >
                {/* Top row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                      {quote.clientName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-white">{quote.clientName}</p>
                      <p className="text-xs text-neutral-500">{quote.eventType} · {quote.date} · <span className="font-mono">{quote.id}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <button className="flex items-center gap-2 px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-colors border border-neutral-700">
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button className="p-1.5 text-neutral-500 hover:text-white transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Services */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {quote.services.map(s => (
                    <span key={s} className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-md font-medium">{s}</span>
                  ))}
                </div>

                {/* Financials */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Progress bar */}
                  <div className="flex-1 w-full">
                    <div className="flex justify-between text-[10px] font-bold text-neutral-500 mb-1.5">
                      <span>Seña: <span className="text-blue-400">{fmt(quote.deposit)}</span></span>
                      <span>Saldo: <span className="text-orange-400">{fmt(remaining)}</span></span>
                      <span>Total: <span className="text-white">{fmt(quote.amount)}</span></span>
                    </div>
                    <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${quote.status === 'paid' ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-neutral-600 mt-1">{pct}% pagado</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuotesBilling;
