import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Square,
  Users,
  Maximize2,
  QrCode,
  Activity,
  MoreVertical,
  Monitor,
  Settings,
  Camera,
  Copy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Track,
  ConnectionQuality,
  ParticipantEvent,
} from 'livekit-client';

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL ?? '';

// ── Signal strength indicator ──────────────────────────────────────────────
const SignalIndicator: React.FC<{ quality: ConnectionQuality }> = ({ quality }) => {
  const bars =
    quality === ConnectionQuality.Excellent
      ? 4
      : quality === ConnectionQuality.Good
        ? 3
        : quality === ConnectionQuality.Poor
          ? 2
          : 1;
  const colorClass =
    bars >= 3 ? 'bg-green-500' : bars === 2 ? 'bg-orange-500' : 'bg-rose-500';
  return (
    <div className="flex items-end gap-0.5 h-3">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-300 ${i <= bars ? colorClass : 'bg-neutral-700'}`}
          style={{ height: `${i * 25}%` }}
        />
      ))}
    </div>
  );
};

// ── Video card for each guest participant ──────────────────────────────────
const GuestVideoCard: React.FC<{
  participant: RemoteParticipant;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}> = ({ participant, index, isSelected, onSelect, onRemove }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [quality, setQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);

  useEffect(() => {
    const attach = () => {
      const pub = participant.getTrackPublication(Track.Source.Camera);
      if (pub?.videoTrack && videoRef.current) {
        pub.videoTrack.attach(videoRef.current);
        setHasVideo(true);
      }
    };

    attach();

    const onTrackSubscribed = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        setHasVideo(true);
      }
    };

    const onQualityChanged = (q: ConnectionQuality) => setQuality(q);

    participant.on(ParticipantEvent.TrackSubscribed, onTrackSubscribed);
    participant.on(ParticipantEvent.ConnectionQualityChanged, onQualityChanged);

    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, onTrackSubscribed);
      participant.off(ParticipantEvent.ConnectionQualityChanged, onQualityChanged);
      const pub = participant.getTrackPublication(Track.Source.Camera);
      if (pub?.videoTrack && videoRef.current) {
        pub.videoTrack.detach(videoRef.current);
      }
    };
  }, [participant]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
      className={`
        group relative aspect-video rounded-2xl overflow-hidden bg-neutral-900 border transition-all duration-300 cursor-pointer
        ${isSelected ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'border-neutral-800 hover:border-neutral-600 hover:shadow-lg'}
      `}
      onClick={onSelect}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isSelected ? 'opacity-100' : 'opacity-70 group-hover:opacity-90'}`}
      />

      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-600 gap-2">
          <Camera className="w-6 h-6 opacity-40" />
          <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Conectando...</p>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

      <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
        <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
          <SignalIndicator quality={quality} />
        </div>
        <button
          className="p-1.5 bg-black/60 backdrop-blur-md rounded-md border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => { e.stopPropagation(); onRemove(); }}
        >
          <MoreVertical className="w-3 h-3" />
        </button>
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2">
        <p className="text-[10px] font-bold text-white truncate drop-shadow-md">
          Cámara {index + 1}
        </p>
        <div className="flex gap-2">
          <button
            onClick={e => { e.stopPropagation(); onSelect(); }}
            className={`
              flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
              ${isSelected
                ? 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.4)]'
                : 'bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-transparent'}
            `}
          >
            {isSelected ? 'EN MASTER' : 'PROYECTAR'}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="px-2 py-1.5 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500/20 transition-all border border-rose-500/20"
          >
            <Square className="w-3 h-3 fill-current" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ── Master view video ──────────────────────────────────────────────────────
const MasterVideo: React.FC<{ participant: RemoteParticipant | null }> = ({ participant }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!participant) return;

    const attach = () => {
      const pub = participant.getTrackPublication(Track.Source.Camera);
      if (pub?.videoTrack && videoRef.current) {
        pub.videoTrack.attach(videoRef.current);
      }
    };

    attach();

    const onTrackSubscribed = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
      }
    };

    participant.on(ParticipantEvent.TrackSubscribed, onTrackSubscribed);

    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, onTrackSubscribed);
      const pub = participant.getTrackPublication(Track.Source.Camera);
      if (pub?.videoTrack && videoRef.current) {
        pub.videoTrack.detach(videoRef.current);
      }
    };
  }, [participant]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover grayscale-[0.1]"
    />
  );
};

// ── Main LiveControl component ─────────────────────────────────────────────
const LiveControl: React.FC = () => {
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null);
  const [showFullQR, setShowFullQR] = useState(false);
  const [localIp, setLocalIp] = useState('192.168.1.42');
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [latency, setLatency] = useState<number | null>(null);

  const roomRef = useRef<Room | null>(null);

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const getBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    if (isLocalhost) return `http://${localIp}:${window.location.port || '3001'}`;
    return window.location.origin;
  };

  const shareUrl = roomId ? `${getBaseUrl()}/live/${roomId}` : '';
  const qrCodeUrl = shareUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(shareUrl)}&color=0-0-0&bgcolor=FFFFFF`
    : '';

  const connectRoom = useCallback(async (id: string) => {
    if (!LIVEKIT_URL) return;
    try {
      const res = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: id, identity: 'admin', role: 'admin' }),
      });
      const { token } = await res.json();

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
        setParticipants(prev => [...prev, p]);
      });

      room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
        setParticipants(prev => prev.filter(x => x.identity !== p.identity));
        setSelectedIdentity(prev => (prev === p.identity ? null : prev));
      });

      room.on(
        RoomEvent.TrackSubscribed,
        (_track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
          setParticipants(prev =>
            prev.map(p => (p.identity === participant.identity ? participant : p))
          );
        }
      );

      room.on(RoomEvent.ConnectionQualityChanged, (_quality, participant) => {
        if (participant === room.localParticipant) return;
        setLatency(room.engine?.client?.rtt ?? null);
      });

      await room.connect(LIVEKIT_URL, token);

      // Capture already-connected participants (edge case: race condition)
      setParticipants(Array.from(room.remoteParticipants.values()));
    } catch (err) {
      console.error('Failed to connect as admin', err);
    }
  }, []);

  const broadcastSelection = useCallback((identity: string) => {
    const room = roomRef.current;
    if (!room) return;
    // Data message for participants already connected
    const data = new TextEncoder().encode(
      JSON.stringify({ type: 'SELECT_STREAM', participantIdentity: identity })
    );
    room.localParticipant.publishData(data, { reliable: true });
    // Metadata so late-joiners (stage screen) read the selection on connect
    room.localParticipant.setMetadata(JSON.stringify({ selectedIdentity: identity }));
  }, []);

  const handleToggleRoom = async () => {
    if (!isRoomOpen) {
      const newId = `room_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      setRoomId(newId);
      setParticipants([]);
      setSelectedIdentity(null);
      setIsRoomOpen(true);
      await connectRoom(newId);
    } else {
      // Notify all guests before disconnecting
      if (roomRef.current) {
        const data = new TextEncoder().encode(JSON.stringify({ type: 'ROOM_CLOSED' }));
        roomRef.current.localParticipant.publishData(data, { reliable: true });
        await new Promise(resolve => setTimeout(resolve, 400));
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      setRoomId(null);
      setParticipants([]);
      setSelectedIdentity(null);
      setIsRoomOpen(false);
    }
  };

  const handleProjectStream = (identity: string) => {
    setSelectedIdentity(identity);
    broadcastSelection(identity);
  };

  const handleRemoveStream = (identity: string) => {
    setParticipants(prev => prev.filter(p => p.identity !== identity));
    if (selectedIdentity === identity) setSelectedIdentity(null);
  };

  useEffect(() => {
    return () => { roomRef.current?.disconnect(); };
  }, []);

  const masterParticipant = participants.find(p => p.identity === selectedIdentity) ?? null;

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
          <p className="text-neutral-500 mt-1">Event Management & Real-time Switching.</p>
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

        {/* Left Column */}
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
                        <img src={qrCodeUrl} alt="Room QR Code" className="w-40 h-40 mix-blend-multiply" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center border-2 border-orange-500">
                          <Camera className="w-5 h-5 text-orange-500" />
                        </div>
                      </div>
                      <button
                        onClick={() => setShowFullQR(true)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur text-white rounded-lg hover:bg-black/80 transition-colors border border-white/10 shadow-lg"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                        ID DE SALA
                        <button
                          onClick={() => navigator.clipboard.writeText(shareUrl)}
                          className="hover:text-white transition-colors"
                          title="Copiar link"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </p>
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
                  onChange={e => setLocalIp(e.target.value)}
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
                <span className="text-xs font-bold text-white">{isRoomOpen ? participants.length : 0}</span>
              </div>
              {isRoomOpen && roomId && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Pantalla de Sala</span>
                  <a
                    href={`${window.location.origin}/stage/${roomId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-orange-500 hover:underline"
                  >
                    Abrir proyector →
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="bg-orange-500/5 border border-orange-500/10 p-6 rounded-3xl space-y-4">
            <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4" /> Signal Metrics
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">RTT Latency</span>
                <span className="text-white font-mono">{latency !== null ? `~${latency}ms` : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">Streams activos</span>
                <span className="text-white font-mono">{participants.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="xl:col-span-9 flex flex-col gap-8 h-full">

          {/* Master View */}
          <div className="relative group">
            <div className={`
              relative aspect-video rounded-[2rem] overflow-hidden bg-neutral-900 border-2 transition-all duration-700
              ${selectedIdentity ? 'border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.15)] ring-4 ring-orange-500/20' : 'border-neutral-800'}
            `}
              style={selectedIdentity ? { animation: 'master-pulse 3s infinite alternate' } : {}}
            >
              <AnimatePresence mode="wait">
                {masterParticipant ? (
                  <motion.div
                    key={masterParticipant.identity}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0"
                  >
                    <MasterVideo participant={masterParticipant} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    <div className="absolute top-6 left-6 flex items-center gap-3">
                      <div className="bg-rose-600 text-white px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-[0_0_15px_rgba(225,29,72,0.6)]">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        ON AIR
                      </div>
                      <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border border-white/10">
                        Main Screen Output
                      </div>
                    </div>

                    <div className="absolute top-6 right-6 opacity-50 mix-blend-overlay">
                      <p className="text-white font-black tracking-[0.3em] text-lg drop-shadow-lg">
                        9669<span className="text-orange-500">.STUDIO</span>
                      </p>
                    </div>

                    <div className="absolute bottom-8 left-8">
                      <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">Source: Guest Camera</p>
                      <h4 className="text-2xl font-bold text-white drop-shadow-md">
                        Cámara {participants.findIndex(p => p.identity === selectedIdentity) + 1}
                      </h4>
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

            <div className="absolute bottom-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white hover:bg-black/60 transition-colors">
                <Maximize2 className="w-4 h-4" />
              </button>
              <button className="p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white hover:bg-black/60 transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Incoming Streams Grid */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                Incoming Streams
                <span className="text-[10px] bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">{participants.length}</span>
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                  <div className="w-2 h-2 rounded-full bg-green-500" /> Auto-Switch Off
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
              <AnimatePresence>
                {participants.length === 0 && isRoomOpen && (
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

                {participants.map((participant, index) => (
                  <GuestVideoCard
                    key={participant.identity}
                    participant={participant}
                    index={index}
                    isSelected={selectedIdentity === participant.identity}
                    onSelect={() => handleProjectStream(participant.identity)}
                    onRemove={() => handleRemoveStream(participant.identity)}
                  />
                ))}
              </AnimatePresence>

              {isRoomOpen && participants.length > 0 && participants.length < 8 && (
                <motion.div
                  layout
                  className="border-2 border-dashed border-neutral-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-neutral-700 hover:text-neutral-500 hover:border-neutral-700 transition-all cursor-pointer h-full min-h-[120px] bg-neutral-900/10"
                >
                  <Users className="w-6 h-6 opacity-20" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Slot disponible</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #262626; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #404040; }
        @keyframes master-pulse {
          0% { border-color: rgba(249,115,22,0.4); box-shadow: 0 0 20px rgba(249,115,22,0.1); }
          100% { border-color: rgba(249,115,22,1); box-shadow: 0 0 60px rgba(249,115,22,0.3); }
        }
      `}</style>
    </div>
  );
};

export default LiveControl;
