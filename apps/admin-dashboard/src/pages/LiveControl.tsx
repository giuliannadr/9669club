import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Users, 
  Mic, 
  Maximize2, 
  QrCode,
  Wifi,
  Activity,
  Zap,
  MoreVertical,
  ChevronRight,
  Monitor,
  Settings,
  Camera,
  Link2,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GuestStream {
  id: string;
  name: string;
  thumbnail: string;
  latency: number;
  signal: number; // 0 to 100
}

const SignalIndicator: React.FC<{ strength: number }> = ({ strength }) => {
  const colorClass = strength > 70 ? 'bg-green-500' : strength > 40 ? 'bg-orange-500' : 'bg-rose-500';
  return (
    <div className="flex items-end gap-0.5 h-3">
      {[20, 40, 60, 80].map((threshold) => (
        <div 
          key={threshold} 
          className={`w-1 rounded-full transition-all duration-300 ${strength >= threshold ? colorClass : 'bg-neutral-700'}`}
          style={{ height: `${threshold}%` }}
        />
      ))}
    </div>
  );
};

const LiveControl: React.FC = () => {
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [showFullQR, setShowFullQR] = useState(false);
  const [localIp, setLocalIp] = useState('192.168.1.42');
  const [guestStreams, setGuestStreams] = useState<GuestStream[]>([
    { id: '1', name: 'Martín García', thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=400', latency: 45, signal: 92 },
    { id: '2', name: 'Sofía Rodríguez', thumbnail: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&q=80&w=400', latency: 120, signal: 45 },
    { id: '3', name: 'Julian Pérez', thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400', latency: 68, signal: 78 },
  ]);

  const masterStream = guestStreams.find(s => s.id === selectedStreamId);

  // Handle Room Opening & ID generation
  const handleToggleRoom = () => {
    if (!isRoomOpen) {
      const newId = `room_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      setRoomId(newId);
      setGuestStreams([]); // Clear previous streams
    } else {
      setRoomId(null);
      setGuestStreams([]);
    }
    setIsRoomOpen(!isRoomOpen);
  };

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  const getBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    if (isLocalhost) {
      return `http://${localIp}:${window.location.port || '3003'}`;
    }
    // En producción (Vercel) usamos el origen real (https://...)
    return window.location.origin;
  };

  const shareUrl = roomId ? `${getBaseUrl()}/live/${roomId}` : '';
  const qrCodeUrl = shareUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(shareUrl)}&color=0-0-0&bgcolor=FFFFFF` : '';

  // Simulate WebRTC / Socket.io Sync via LocalStorage (Cross-tab communication)
  useEffect(() => {
    if (!isRoomOpen || !roomId) return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'AV_STREAM_JOIN' && e.newValue) {
        const data = JSON.parse(e.newValue);
        if (data.roomId === roomId) {
          // Check if already exists
          setGuestStreams(prev => {
            if (prev.find(s => s.id === data.guestId)) return prev;
            return [...prev, {
              id: data.guestId,
              name: `Cámara ${prev.length + 1} (Guest)`,
              thumbnail: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80',
              signal: 100,
              latency: Math.floor(Math.random() * 30) + 10,
            }];
          });
        }
      }

      if (e.key === 'AV_STREAM_LEAVE' && e.newValue) {
        const data = JSON.parse(e.newValue);
        if (data.roomId === roomId) {
          setGuestStreams(prev => prev.filter(s => s.id !== data.guestId));
          if (selectedStreamId === data.guestId) setSelectedStreamId(null);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isRoomOpen, roomId, selectedStreamId]);

  return (
    <div className="flex flex-col min-h-full text-neutral-300 pb-20">
      
      {/* Fullscreen QR Modal */}
      <AnimatePresence>
        {showFullQR && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8"
          >
            <button 
              onClick={() => setShowFullQR(false)}
              className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <Maximize2 className="w-6 h-6" />
            </button>
            <div className="relative p-4 bg-gradient-to-tr from-orange-500 to-rose-500 rounded-[3rem] shadow-[0_0_100px_rgba(249,115,22,0.4)]">
              <div className="bg-white p-6 rounded-[2.5rem] relative">
                <img src={qrCodeUrl} alt="Room QR" className="w-96 h-96 rounded-2xl mix-blend-multiply" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center border-4 border-orange-500">
                  <Camera className="w-10 h-10 text-orange-500" />
                </div>
              </div>
            </div>
            <p className="text-white mt-12 text-3xl font-black tracking-widest uppercase">Escanea para unirte</p>
            <p className="text-neutral-400 mt-2 text-xl">SALA: {roomId?.split('_')[1]}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Broadcast Studio
            {isRoomOpen && (
              <motion.span 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-black flex items-center gap-1.5"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                Live Room
              </motion.span>
            )}
          </h2>
          <p className="text-neutral-500 mt-1">Gourmet Event Management & Real-time Switching.</p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleToggleRoom}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-lg ${isRoomOpen ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-orange-500 text-white shadow-orange-500/20'}`}
          >
            {isRoomOpen ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            {isRoomOpen ? 'Cerrar Sala' : 'Abrir Sala'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Config & QR */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 p-6 rounded-3xl space-y-6">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Configuración del Evento</h3>
            
            {/* QR Section */}
            <div className="relative group min-h-[200px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {isRoomOpen ? (
                  <motion.div 
                    key="qr-active"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full flex flex-col items-center gap-4"
                  >
                    <div className="bg-white p-4 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-[1.02] relative border-2 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                      <div className="relative">
                        <img 
                          src={qrCodeUrl} 
                          alt="Room QR Code" 
                          className="w-40 h-40 mix-blend-multiply"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                          <Zap className="w-12 h-12 text-orange-500" />
                        </div>
                        {/* Center Camera Icon */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center border-2 border-orange-500">
                          <Camera className="w-5 h-5 text-orange-500" />
                        </div>
                      </div>
                      
                      {/* Expand Button */}
                      <button 
                        onClick={() => setShowFullQR(true)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur text-white rounded-lg hover:bg-black/80 transition-colors border border-white/10 shadow-lg"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">ID DE SALA <button className="hover:text-white transition-colors" title="Copiar"><Copy className="w-3 h-3" /></button></p>
                      <p className="text-sm font-mono font-black text-orange-500">{roomId}</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="qr-inactive"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-800 rounded-2xl w-full h-40"
                  >
                    <QrCode className="w-12 h-12 text-neutral-800 mb-2" />
                    <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">Abre la sala para generar el código QR</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <p className="text-[11px] text-neutral-500 leading-relaxed text-center">
              {isRoomOpen 
                ? 'Los invitados deben escanear este código para empezar a transmitir desde sus celulares.'
                : 'La transmisión está desactivada. Abre la sala para permitir que los invitados se conecten.'}
            </p>

            {isLocalhost && isRoomOpen && (
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 block">IP Red Local (Para móviles)</label>
                <input 
                  type="text" 
                  value={localIp}
                  onChange={(e) => setLocalIp(e.target.value)}
                  className="w-full bg-transparent text-sm font-mono text-orange-400 focus:outline-none"
                  placeholder="Ej: 192.168.1.42"
                />
              </div>
            )}

            <div className="space-y-3 pt-4 border-t border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Estado de Sala</span>
                <span className={`text-xs font-bold ${isRoomOpen ? 'text-green-500' : 'text-neutral-600'}`}>
                  {isRoomOpen ? 'Aceptando Conexiones' : 'Inactivo'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Invitados en vivo</span>
                <span className="text-xs font-bold text-white">{isRoomOpen ? guestStreams.length : 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-orange-500/5 border border-orange-500/10 p-6 rounded-3xl space-y-4">
            <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4" /> Signal Metrics
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">Global Latency</span>
                <span className="text-white font-mono">~64ms</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">Bandwidth Usage</span>
                <span className="text-white font-mono">18.2 Mbps</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Feed & Monitoring */}
        <div className="xl:col-span-9 flex flex-col gap-8 h-full">
          
          {/* Master View */}
          <div className="relative group">
            <div className={`
              relative aspect-video rounded-[2rem] overflow-hidden bg-neutral-900 border-2 transition-all duration-700
              ${selectedStreamId ? 'border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.15)] ring-4 ring-orange-500/20' : 'border-neutral-800'}
            `}
            style={selectedStreamId ? { animation: 'master-pulse 3s infinite alternate' } : {}}
            >
              <AnimatePresence mode="wait">
                {masterStream ? (
                  <motion.div 
                    key={masterStream.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0"
                  >
                    <img 
                      src={masterStream.thumbnail} 
                      alt="Master View" 
                      className="w-full h-full object-cover grayscale-[0.2]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    
                    {/* On Air Indicator */}
                    <div className="absolute top-6 left-6 flex items-center gap-3">
                      <div className="bg-rose-600 text-white px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-[0_0_15px_rgba(225,29,72,0.6)]">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        ON AIR
                      </div>
                      <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border border-white/10">
                        Main Screen Output
                      </div>
                    </div>

                    {/* Branding Watermark */}
                    <div className="absolute top-6 right-6 opacity-50 mix-blend-overlay">
                      <p className="text-white font-black tracking-[0.3em] text-lg drop-shadow-lg">
                        9669<span className="text-orange-500">.STUDIO</span>
                      </p>
                    </div>

                    <div className="absolute bottom-8 left-8">
                      <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">Source: Guest Camera</p>
                      <h4 className="text-2xl font-bold text-white drop-shadow-md">{masterStream.name}</h4>
                    </div>
                  </motion.div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-600 gap-4">
                    <Monitor className="w-16 h-16 opacity-20" />
                    <p className="text-sm font-medium uppercase tracking-widest opacity-40">No Input Selected</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
            
            {/* View Controls Overlay */}
            <div className="absolute bottom-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white hover:bg-black/60 transition-colors">
                <Maximize2 className="w-4 h-4" />
              </button>
              <button className="p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white hover:bg-black/60 transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid de Previsualización */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                Incoming Streams
                <span className="text-[10px] bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">{guestStreams.length}</span>
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                  <div className="w-2 h-2 rounded-full bg-green-500" /> Auto-Switch Off
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
              <AnimatePresence>
                {guestStreams.length === 0 && isRoomOpen && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="col-span-full border-2 border-dashed border-neutral-800 rounded-[2rem] flex flex-col items-center justify-center p-12 text-center h-48 bg-neutral-900/30"
                  >
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4 text-neutral-500">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-bold text-neutral-400 mb-2">Esperando conexiones...</p>
                    <p className="text-[11px] text-neutral-600">Pide a los invitados que escaneen el QR para unirse como cámaras.</p>
                  </motion.div>
                )}
                
                {guestStreams.map((stream) => (
                  <motion.div
                    key={stream.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                    className={`
                      group relative aspect-video rounded-2xl overflow-hidden bg-neutral-900 border transition-all duration-300 cursor-pointer
                      ${selectedStreamId === stream.id ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'border-neutral-800 hover:border-neutral-600 hover:shadow-lg'}
                    `}
                    onClick={() => setSelectedStreamId(stream.id)}
                  >
                    <img 
                      src={stream.thumbnail} 
                      alt={stream.name} 
                      className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${selectedStreamId === stream.id ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'}`} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                    
                    <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                      <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                        <SignalIndicator strength={stream.signal} />
                      </div>
                      <button className="p-1.5 bg-black/60 backdrop-blur-md rounded-md border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2">
                      <p className="text-[10px] font-bold text-white truncate drop-shadow-md">{stream.name}</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStreamId(stream.id);
                          }}
                          className={`
                            flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                            ${selectedStreamId === stream.id 
                              ? 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.4)]' 
                              : 'bg-white/10 backdrop-blur-md text-white hover:bg-white/20 hover:border-white/20 border border-transparent'}
                          `}
                        >
                          {selectedStreamId === stream.id ? 'EN MASTER' : 'PROYECTAR'}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setGuestStreams(prev => prev.filter(s => s.id !== stream.id));
                            if (selectedStreamId === stream.id) setSelectedStreamId(null);
                          }}
                          className="px-2 py-1.5 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500/20 transition-all border border-rose-500/20"
                        >
                          <Square className="w-3 h-3 fill-current" />
                        </button>
                      </div>
                    </div>

                    {/* Latency overlay */}
                    <div className="absolute top-2 right-2 text-[8px] font-mono text-neutral-400 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10">
                      {stream.latency}ms
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Add Slot Placeholder */}
              {isRoomOpen && guestStreams.length > 0 && guestStreams.length < 8 && (
                <motion.div layout className="border-2 border-dashed border-neutral-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-neutral-700 hover:text-neutral-500 hover:border-neutral-700 transition-all cursor-pointer h-full min-h-[120px] bg-neutral-900/10">
                  <Users className="w-6 h-6 opacity-20" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Añadir Slot...</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #262626;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #404040;
        }
        @keyframes master-pulse {
          0% { border-color: rgba(249,115,22,0.4); box-shadow: 0 0 20px rgba(249,115,22,0.1); }
          100% { border-color: rgba(249,115,22,1); box-shadow: 0 0 60px rgba(249,115,22,0.3); }
        }
      `}</style>
    </div>
  );
};

export default LiveControl;
