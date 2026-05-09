import React, { useState } from 'react';
import { Star, Download, Play, Heart, Filter, Search, Grid, List, Share2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Asset {
  id: string;
  title: string;
  event: string;
  type: 'photo' | 'video';
  url: string;
  highlighted: boolean;
  aspect: 'square' | 'wide' | 'tall';
}

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-neutral-800 rounded-2xl ${className}`} />
);

const MOCK_ASSETS: Asset[] = [
  { id: '1',  title: 'Momento estrella',    event: 'XV Valentina',   type: 'photo', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80', highlighted: true,  aspect: 'tall'   },
  { id: '2',  title: 'Primer plano novia',  event: 'Boda García',    type: 'photo', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80', highlighted: false, aspect: 'wide'   },
  { id: '3',  title: 'Vals de apertura',    event: 'XV Valentina',   type: 'video', url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80', highlighted: true,  aspect: 'square' },
  { id: '4',  title: 'Decoración salón',    event: 'XV Valentina',   type: 'photo', url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&q=80', highlighted: false, aspect: 'square' },
  { id: '5',  title: 'Entrada cortejo',     event: 'Boda García',    type: 'video', url: 'https://images.unsplash.com/photo-1511795409834-432f7b1728b2?w=600&q=80', highlighted: false, aspect: 'wide'   },
  { id: '6',  title: 'Detalles mesa',       event: 'XV Valentina',   type: 'photo', url: 'https://images.unsplash.com/photo-1578897367078-3b1c9a3e2e4a?w=600&q=80', highlighted: true,  aspect: 'square' },
  { id: '7',  title: 'Discurso padrinos',   event: 'Boda García',    type: 'video', url: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=600&q=80', highlighted: false, aspect: 'tall'   },
  { id: '8',  title: 'Pista de baile',      event: 'Corp. Mueblería',type: 'photo', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80', highlighted: false, aspect: 'wide'   },
];

const EVENTS = ['Todos', 'XV Valentina', 'Boda García', 'Corp. Mueblería'];

const AssetCard: React.FC<{ asset: Asset; onHighlight: (id: string) => void }> = ({ asset, onHighlight }) => {
  const aspectClass = asset.aspect === 'tall' ? 'row-span-2' : asset.aspect === 'wide' ? 'col-span-2' : '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative group rounded-2xl overflow-hidden cursor-pointer ${aspectClass}`}
      style={{ minHeight: asset.aspect === 'square' ? 200 : undefined }}
      whileHover={{ scale: 1.01, zIndex: 10 }}
    >
      <img src={asset.url} alt={asset.title} className="w-full h-full object-cover min-h-[200px] transition-transform duration-700 group-hover:scale-105" />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />

      {/* Type badge */}
      <div className="absolute top-3 left-3">
        {asset.type === 'video' && (
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-full text-[9px] font-black border border-white/10">
            <Play className="w-2.5 h-2.5 fill-current" /> VIDEO
          </div>
        )}
      </div>

      {/* Highlight star */}
      <button
        onClick={e => { e.stopPropagation(); onHighlight(asset.id); }}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 transition-all duration-200"
      >
        <Star className={`w-3.5 h-3.5 ${asset.highlighted ? 'fill-orange-500 text-orange-500' : 'text-neutral-400'}`} />
      </button>

      {/* Highlighted badge */}
      {asset.highlighted && (
        <div className="absolute top-3 left-3 bg-orange-500/90 backdrop-blur text-white px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" /> HIGHLIGHT
        </div>
      )}

      {/* Bottom action bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <p className="text-xs font-bold text-white truncate mb-2">{asset.title}</p>
        <p className="text-[10px] text-neutral-400 mb-3">{asset.event}</p>
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 bg-white text-black py-1.5 rounded-lg text-[10px] font-black hover:bg-neutral-100 transition-colors">
            <Download className="w-3 h-3" /> Exportar
          </button>
          <button className="flex items-center justify-center gap-1.5 bg-white/10 text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/20 transition-colors">
            <Share2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const PortfolioManager: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);
  const [filterEvent, setFilterEvent] = useState('Todos');
  const [filterType, setFilterType] = useState<'all' | 'photo' | 'video'>('all');
  const [showHighlights, setShowHighlights] = useState(false);
  const [loading] = useState(false);

  const filtered = assets.filter(a => {
    if (filterEvent !== 'Todos' && a.event !== filterEvent) return false;
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (showHighlights && !a.highlighted) return false;
    return true;
  });

  const toggleHighlight = (id: string) =>
    setAssets(prev => prev.map(a => a.id === id ? { ...a, highlighted: !a.highlighted } : a));

  const highlightCount = assets.filter(a => a.highlighted).length;

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Portfolio Manager</h2>
          <p className="text-neutral-500 mt-1">Activos visuales de todos los eventos.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">
          <Download className="w-4 h-4" /> Exportar Highlights
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input type="text" placeholder="Buscar activos..." className="pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-orange-500/50 transition-colors w-56" />
        </div>

        {/* Event filter */}
        <div className="flex gap-2 flex-wrap">
          {EVENTS.map(ev => (
            <button key={ev} onClick={() => setFilterEvent(ev)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterEvent === ev ? 'bg-orange-500 text-white' : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-neutral-600'}`}>
              {ev}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex gap-2">
          {(['all', 'photo', 'video'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filterType === t ? 'bg-neutral-700 text-white' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'}`}>
              {t === 'all' ? 'Todo' : t === 'photo' ? 'Fotos' : 'Videos'}
            </button>
          ))}
        </div>

        {/* Highlights toggle */}
        <button
          onClick={() => setShowHighlights(h => !h)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showHighlights ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'}`}
        >
          <Star className={`w-3.5 h-3.5 ${showHighlights ? 'fill-orange-500' : ''}`} />
          Highlights ({highlightCount})
        </button>
      </div>

      {/* Bento Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className={`${i % 3 === 0 ? 'row-span-2 h-96' : 'h-48'}`} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[200px] gap-4">
          <AnimatePresence>
            {filtered.map(asset => (
              <AssetCard key={asset.id} asset={asset} onHighlight={toggleHighlight} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-neutral-700">
          <Grid className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-bold">Sin resultados para este filtro</p>
        </div>
      )}
    </div>
  );
};

export default PortfolioManager;
