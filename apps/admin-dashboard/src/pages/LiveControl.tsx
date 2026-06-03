import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Square,
  Users,
  Maximize2,
  QrCode,
  Activity,
  Camera,
  Copy,
  Sliders,
} from 'lucide-react';

type FilterId = 'none' | 'retro';
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
const SYSTEM_IDENTITIES = new Set(['admin', 'stage']);

// ── Signal bars ───────────────────────────────────────────────────────────────
const SignalIndicator: React.FC<{ quality: ConnectionQuality }> = ({ quality }) => {
  const bars =
    quality === ConnectionQuality.Excellent ? 4
    : quality === ConnectionQuality.Good ? 3
    : quality === ConnectionQuality.Poor ? 2
    : 1;
  const colorClass = bars >= 3 ? 'bg-green-500' : bars === 2 ? 'bg-orange-500' : 'bg-rose-500';
  return (
    <div className="flex items-end gap-0.5 h-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className={`w-1 rounded-full transition-all ${i <= bars ? colorClass : 'bg-neutral-700'}`} style={{ height: `${i * 25}%` }} />
      ))}
    </div>
  );
};

// ── Guest video card ──────────────────────────────────────────────────────────
const GuestVideoCard: React.FC<{
  participant: RemoteParticipant;
  index: number;
  selectionIndex: number | null; // null = not selected, 0/1/2 = which slot
  disabled: boolean;             // can't select more (3 already selected)
  onSelect: () => void;
  onRemove: () => void;
}> = ({ participant, index, selectionIndex, disabled, onSelect, onRemove }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [quality, setQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);
  const isSelected = selectionIndex !== null;

  useEffect(() => {
    const attach = () => {
      const pub = participant.getTrackPublication(Track.Source.Camera);
      if (pub?.videoTrack && videoRef.current) { pub.videoTrack.attach(videoRef.current); setHasVideo(true); }
    };
    attach();
    const onTrack = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && videoRef.current) { track.attach(videoRef.current); setHasVideo(true); }
    };
    const onQ = (q: ConnectionQuality) => setQuality(q);
    participant.on(ParticipantEvent.TrackSubscribed, onTrack);
    participant.on(ParticipantEvent.ConnectionQualityChanged, onQ);
    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, onTrack);
      participant.off(ParticipantEvent.ConnectionQualityChanged, onQ);
      const pub = participant.getTrackPublication(Track.Source.Camera);
      if (pub?.videoTrack && videoRef.current) pub.videoTrack.detach(videoRef.current);
    };
  }, [participant]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
      className={`group relative aspect-[16/9] rounded-2xl overflow-hidden bg-black border transition-all duration-300 cursor-pointer
        ${isSelected ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.35)]' : 'border-neutral-800 hover:border-neutral-600'}`}
      onClick={!disabled || isSelected ? onSelect : undefined}
    >
      {/* Wrapper handles opacity; video rotates portrait→landscape to fill 16:9 card */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${isSelected ? 'opacity-100' : 'opacity-60 group-hover:opacity-85'}`}>
        <video ref={videoRef} autoPlay playsInline muted className="card-video" />
      </div>

      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-600 gap-2">
          <Camera className="w-6 h-6 opacity-40" />
          <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Conectando...</p>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

      {/* Selection badge */}
      {isSelected && (
        <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shadow-lg z-10">
          <span className="text-white font-black text-[10px]">{(selectionIndex ?? 0) + 1}</span>
        </div>
      )}

      <div className="absolute top-2 right-2">
        <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
          <SignalIndicator quality={quality} />
        </div>
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2">
        <p className="text-[10px] font-bold text-white truncate drop-shadow-md">Cámara {index + 1}</p>
        <div className="flex gap-2">
          <button
            onClick={e => { e.stopPropagation(); if (!disabled || isSelected) onSelect(); }}
            disabled={disabled && !isSelected}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
              ${isSelected
                ? 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.4)]'
                : disabled
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-white/10 backdrop-blur-md text-white hover:bg-white/20'}`}
          >
            {isSelected ? `PANTALLA ${(selectionIndex ?? 0) + 1}` : 'PROYECTAR'}
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

// ── Retro overlay for admin preview (mini version — no text, just vignette+brackets) ──
const RetroPreviewOverlay: React.FC<{ partyName: string }> = ({ partyName }) => {
  const name = (partyName || 'EVENT').toUpperCase();
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10" style={{ fontFamily: 'monospace' }}>
      {/* Vignette */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.72) 100%)',
      }} />
      {/* Corner brackets */}
      {[
        { top: '6%',    left: '4%',   borderTop: '1.5px solid rgba(255,255,255,0.6)', borderLeft: '1.5px solid rgba(255,255,255,0.6)' },
        { top: '6%',    right: '4%',  borderTop: '1.5px solid rgba(255,255,255,0.6)', borderRight: '1.5px solid rgba(255,255,255,0.6)' },
        { bottom: '6%', left: '4%',   borderBottom: '1.5px solid rgba(255,255,255,0.6)', borderLeft: '1.5px solid rgba(255,255,255,0.6)' },
        { bottom: '6%', right: '4%',  borderBottom: '1.5px solid rgba(255,255,255,0.6)', borderRight: '1.5px solid rgba(255,255,255,0.6)' },
      ].map((s, i) => (
        <div key={i} className="absolute" style={{ width: 12, height: 12, ...s }} />
      ))}
      {/* Party name — top right, clear of bracket */}
      <div className="absolute" style={{
        top: '16%', right: '7%',
        textAlign: 'right',
        color: 'rgba(255,255,255,0.8)',
        fontSize: 7,
        fontWeight: 900,
        letterSpacing: '0.06em',
        lineHeight: 1.2,
        textShadow: '0 1px 3px rgba(0,0,0,0.8)',
      }}>
        {name}<br />
        <span style={{ fontSize: 6, fontWeight: 700, letterSpacing: '0.2em', opacity: 0.75 }}>CAM</span>
      </div>
      {/* REC dot — top center */}
      <div className="absolute" style={{ top: '14%', left: '50%', transform: 'translateX(-50%)' }}>
        <div className="flex items-center gap-1" style={{ color: 'rgba(255,50,50,0.9)', fontSize: 6 }}>
          <span style={{
            width: 4, height: 4, borderRadius: '50%',
            background: 'rgba(255,50,50,0.9)',
            display: 'inline-block',
            animation: 'lcPulse 1s infinite',
          }} />
          REC
        </div>
      </div>
      {/* Scan lines */}
      <div className="absolute inset-0" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 3px)',
      }} />
    </div>
  );
};

// ── Video preview slot (raw video, rotated, inside the admin projector preview) ──
// Container is 16:9. Rotation math: slot (W/count × H) → video css w=H/slotW×100%, h=slotW/H×100%
const VideoPreviewSlot: React.FC<{
  participant: RemoteParticipant;
  count: number;
  activeFilter: FilterId;
  partyName: string;
}> = ({ participant, count, activeFilter, partyName }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const pub = participant.getTrackPublication(Track.Source.Camera);
    if (pub?.videoTrack && videoRef.current) pub.videoTrack.attach(videoRef.current);
    const onTrack = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && videoRef.current) track.attach(videoRef.current);
    };
    participant.on(ParticipantEvent.TrackSubscribed, onTrack);
    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, onTrack);
      const pub2 = participant.getTrackPublication(Track.Source.Camera);
      if (pub2?.videoTrack && videoRef.current) pub2.videoTrack.detach(videoRef.current);
    };
  }, [participant]);

  // 16:9 container: slotRatio = slotW/slotH
  // Row layout (1,2,3): slotRatio = (16/count)/9
  // 2×2 grid (4):      slotRatio = (16/2)/(9/2) = 16/9 (same as count=1)
  const countForRatio = count <= 3 ? count : 1;
  const slotRatio = 16 / (9 * countForRatio);
  const videoStyle: React.CSSProperties = {
    position: 'absolute', top: '50%', left: '50%',
    width: `${100 / slotRatio}%`,
    height: `${100 * slotRatio}%`,
    transform: 'translate(-50%, -50%) rotate(90deg)',
    objectFit: 'cover',
    filter: activeFilter === 'retro' ? 'grayscale(1) contrast(1.08) brightness(0.88)' : 'none',
  };

  const slotStyle: React.CSSProperties =
    count === 4
      ? { width: '50%', height: '50%', position: 'relative', overflow: 'hidden', flexShrink: 0 }
      : { flex: 1, height: '100%', position: 'relative', overflow: 'hidden' };

  return (
    <div style={slotStyle}>
      <video ref={videoRef} autoPlay playsInline muted style={videoStyle} />
      {/* Per-slot retro overlay in admin preview */}
      {activeFilter === 'retro' && <RetroPreviewOverlay partyName={partyName} />}
    </div>
  );
};

// ── Projector preview ─────────────────────────────────────────────────────────
const ProjectorPreview: React.FC<{
  selectedParticipants: RemoteParticipant[];
  qrUrl: string;
  activeFilter: FilterId;
  partyName: string;
}> = ({ selectedParticipants, qrUrl, activeFilter, partyName }) => {
  const count = selectedParticipants.length;
  return (
    <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden bg-[#080808]">
      {/* Blobs — always shown */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="pv-blob pv-b1" />
        <div className="pv-blob pv-b2" />
        <div className="pv-blob pv-b3" />
      </div>

      {count === 0 ? (
        /* Waiting state — shows QR since this is admin-only */
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center z-10">
          {qrUrl && (
            <div className="relative">
              <div className="absolute -inset-2 rounded-2xl bg-orange-500/20 blur-lg animate-pulse" />
              <div className="relative bg-white p-3 rounded-2xl shadow-xl">
                <img src={qrUrl} alt="QR" className="w-20 h-20 block" />
              </div>
            </div>
          )}
          <p className="text-white font-black text-base tracking-tight leading-tight">
            ESCANEÁ<br /><span className="text-orange-500">&amp; SÉ PARTE</span>
          </p>
          <p className="text-white/30 text-[9px] uppercase tracking-[0.3em]">del momento</p>
        </div>
      ) : (
        /* Raw video grid — each slot handles its own filter overlay */
        <div
          className="absolute inset-0"
          style={{ display: 'flex', flexWrap: count === 4 ? 'wrap' : 'nowrap' }}
        >
          {selectedParticipants.map(p => (
            <VideoPreviewSlot
              key={p.identity}
              participant={p}
              count={count}
              activeFilter={activeFilter}
              partyName={partyName}
            />
          ))}
        </div>
      )}

      {/* ON AIR badge */}
      {count > 0 && (
        <div className="absolute top-3 left-3 z-20">
          <div className="bg-rose-600 text-white px-2 py-0.5 rounded text-[9px] font-black flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> ON AIR
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main LiveControl ──────────────────────────────────────────────────────────
const LiveControl: React.FC = () => {
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [selectedIdentities, setSelectedIdentities] = useState<string[]>([]);
  const [showFullQR, setShowFullQR] = useState(false);
  const [localIp, setLocalIp] = useState('192.168.1.42');
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [maxStreams, setMaxStreams] = useState(2); // 1-4
  const [activeFilter, setActiveFilter] = useState<FilterId>('none');
  const [partyName, setPartyName] = useState('');
  const [partyNameInput, setPartyNameInput] = useState('');

  const roomRef = useRef<Room | null>(null);
  const selectedIdentitiesRef = useRef<string[]>([]);
  const maxStreamsRef = useRef(2);
  const activeFilterRef = useRef<FilterId>('none');
  const partyNameRef = useRef('');

  const isLocalhost = typeof window !== 'undefined' &&
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

  const broadcastSelections = useCallback(async (identities: string[]) => {
    const room = roomRef.current;
    if (!room) return;
    const data = new TextEncoder().encode(JSON.stringify({ type: 'SELECT_STREAMS', identities }));
    room.localParticipant.publishData(data, { reliable: true });
    await room.localParticipant.setMetadata(JSON.stringify({
      selectedIdentities: identities,
      filter: activeFilterRef.current,
      partyName: partyNameRef.current,
    }));
  }, []);

  const broadcastFilter = useCallback(async (filter: FilterId, name: string) => {
    const room = roomRef.current;
    if (!room) return;
    const data = new TextEncoder().encode(JSON.stringify({ type: 'SET_FILTER', filter, partyName: name }));
    room.localParticipant.publishData(data, { reliable: true });
    await room.localParticipant.setMetadata(JSON.stringify({
      selectedIdentities: selectedIdentitiesRef.current,
      filter,
      partyName: name,
    }));
  }, []);

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
        if (SYSTEM_IDENTITIES.has(p.identity)) {
          if (p.identity === 'stage') {
            // Rebroadcast current selections and filter to the newly connected stage
            const rebroadcast = () => {
              const r = roomRef.current;
              if (!r) return;
              if (selectedIdentitiesRef.current.length > 0) {
                const d = new TextEncoder().encode(JSON.stringify({ type: 'SELECT_STREAMS', identities: selectedIdentitiesRef.current }));
                r.localParticipant.publishData(d, { reliable: true });
              }
              if (activeFilterRef.current !== 'none') {
                const d2 = new TextEncoder().encode(JSON.stringify({ type: 'SET_FILTER', filter: activeFilterRef.current, partyName: partyNameRef.current }));
                r.localParticipant.publishData(d2, { reliable: true });
              }
            };
            setTimeout(rebroadcast, 1000);
            setTimeout(rebroadcast, 2500);
          }
          return;
        }
        setParticipants(prev => [...prev, p]);
      });

      room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
        setParticipants(prev => prev.filter(x => x.identity !== p.identity));
        setSelectedIdentities(prev => {
          const next = prev.filter(id => id !== p.identity);
          selectedIdentitiesRef.current = next;
          return next;
        });
      });

      room.on(RoomEvent.TrackSubscribed, (_t: RemoteTrack, _p: RemoteTrackPublication, participant: RemoteParticipant) => {
        setParticipants(prev => prev.map(p => p.identity === participant.identity ? participant : p));
      });

      room.on(RoomEvent.ConnectionQualityChanged, (_quality, participant) => {
        if (participant === room.localParticipant) return;
        setLatency(room.engine?.client?.rtt ?? null);
      });

      await room.connect(LIVEKIT_URL, token);
      setParticipants(Array.from(room.remoteParticipants.values()).filter(p => !SYSTEM_IDENTITIES.has(p.identity)));
    } catch (err) {
      console.error('Failed to connect as admin', err);
    }
  }, []);

  const handleToggleRoom = async () => {
    if (!isRoomOpen) {
      const newId = `room_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      setRoomId(newId);
      setParticipants([]);
      setSelectedIdentities([]);
      selectedIdentitiesRef.current = [];
      setIsRoomOpen(true);
      await connectRoom(newId);
    } else {
      if (roomRef.current) {
        const data = new TextEncoder().encode(JSON.stringify({ type: 'ROOM_CLOSED' }));
        roomRef.current.localParticipant.publishData(data, { reliable: true });
        await new Promise(resolve => setTimeout(resolve, 400));
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      setRoomId(null);
      setParticipants([]);
      setSelectedIdentities([]);
      selectedIdentitiesRef.current = [];
      setIsRoomOpen(false);
    }
  };

  const broadcastOnScreen = useCallback((identity: string, onScreen: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    const type = onScreen ? 'ON_SCREEN' : 'OFF_SCREEN';
    const data = new TextEncoder().encode(JSON.stringify({ type, identity }));
    room.localParticipant.publishData(data, { reliable: true });
  }, []);

  const handleProjectStream = async (identity: string) => {
    const current = selectedIdentitiesRef.current;
    const max = maxStreamsRef.current;
    const isAlreadySelected = current.includes(identity);
    let next: string[];
    if (isAlreadySelected) {
      next = current.filter(id => id !== identity);
    } else if (current.length < max) {
      next = [...current, identity];
    } else {
      return; // already at max
    }
    selectedIdentitiesRef.current = next;
    setSelectedIdentities(next);
    // Notify the guest whether they're now on screen or not
    broadcastOnScreen(identity, !isAlreadySelected);
    try { await broadcastSelections(next); } catch { /* ignore if no room */ }
  };

  const handleSetMaxStreams = (n: number) => {
    maxStreamsRef.current = n;
    setMaxStreams(n);
    // If currently selected more than new max, trim and rebroadcast
    if (selectedIdentitiesRef.current.length > n) {
      const trimmed = selectedIdentitiesRef.current.slice(0, n);
      selectedIdentitiesRef.current = trimmed;
      setSelectedIdentities(trimmed);
      broadcastSelections(trimmed).catch(() => {});
    }
  };

  const handleSetFilter = (filter: FilterId) => {
    const name = filter === 'none' ? '' : (partyNameInput.trim() || partyName || 'EVENT');
    activeFilterRef.current = filter;
    partyNameRef.current = name;
    setActiveFilter(filter);
    setPartyName(name);
    broadcastFilter(filter, name).catch(() => {});
  };

  const handleApplyPartyName = () => {
    const name = partyNameInput.trim() || 'EVENT';
    partyNameRef.current = name;
    setPartyName(name);
    setPartyNameInput(name);
    broadcastFilter(activeFilter, name).catch(() => {});
  };

  const handleRemoveStream = (identity: string) => {
    // If they were on screen, notify them they're no longer projected
    if (selectedIdentitiesRef.current.includes(identity)) {
      broadcastOnScreen(identity, false);
    }
    setParticipants(prev => prev.filter(p => p.identity !== identity));
    setSelectedIdentities(prev => {
      const next = prev.filter(id => id !== identity);
      selectedIdentitiesRef.current = next;
      return next;
    });
  };

  useEffect(() => { return () => { roomRef.current?.disconnect(); }; }, []);

  const selectedParticipants = participants.filter(p => selectedIdentities.includes(p.identity))
    .sort((a, b) => selectedIdentities.indexOf(a.identity) - selectedIdentities.indexOf(b.identity));

  return (
    <div className="flex flex-col min-h-full text-neutral-300 pb-20">

      {/* Fullscreen QR */}
      <AnimatePresence>
        {showFullQR && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8"
          >
            <button onClick={() => setShowFullQR(false)} className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white">
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

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Broadcast Studio
            {isRoomOpen && (
              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-black flex items-center gap-1.5"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Live Room
              </motion.span>
            )}
          </h2>
          <p className="text-neutral-500 mt-1">Event Management &amp; Real-time Switching.</p>
        </div>
        <button onClick={handleToggleRoom}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-lg
            ${isRoomOpen ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-orange-500 text-white shadow-orange-500/20'}`}
        >
          {isRoomOpen ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          {isRoomOpen ? 'Cerrar Sala' : 'Abrir Sala'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

        {/* Left panel */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 p-6 rounded-3xl space-y-6">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Configuración del Evento</h3>

            <div className="relative group min-h-[200px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {isRoomOpen ? (
                  <motion.div key="qr-active" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full flex flex-col items-center gap-4"
                  >
                    <div className="bg-white p-4 rounded-2xl flex items-center justify-center relative border-2 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                      <div className="relative">
                        <img src={qrCodeUrl} alt="Room QR Code" className="w-40 h-40 mix-blend-multiply" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center border-2 border-orange-500">
                          <Camera className="w-5 h-5 text-orange-500" />
                        </div>
                      </div>
                      <button onClick={() => setShowFullQR(true)} className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur text-white rounded-lg hover:bg-black/80 transition-colors border border-white/10">
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                        ID DE SALA
                        <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="hover:text-white transition-colors" title="Copiar link">
                          <Copy className="w-3 h-3" />
                        </button>
                      </p>
                      <p className="text-sm font-mono font-black text-orange-500">{roomId}</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="qr-inactive" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
                ? 'Los invitados deben escanear este código para empezar a transmitir.'
                : 'Abre la sala para permitir que los invitados se conecten.'}
            </p>

            {isLocalhost && isRoomOpen && (
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 block">IP Red Local</label>
                <input type="text" value={localIp} onChange={e => setLocalIp(e.target.value)}
                  className="w-full bg-transparent text-sm font-mono text-orange-400 focus:outline-none" placeholder="192.168.1.42"
                />
              </div>
            )}

            <div className="space-y-3 pt-4 border-t border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Estado</span>
                <span className={`text-xs font-bold ${isRoomOpen ? 'text-green-500' : 'text-neutral-600'}`}>
                  {isRoomOpen ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Invitados</span>
                <span className="text-xs font-bold text-white">{isRoomOpen ? participants.length : 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">En proyector</span>
                <span className="text-xs font-bold text-orange-400">{selectedIdentities.length}/{maxStreams}</span>
              </div>
              {/* Max streams selector */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Máx. pantallas</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map(n => (
                    <button
                      key={n}
                      onClick={() => handleSetMaxStreams(n)}
                      className={`w-6 h-6 rounded-md text-[11px] font-black transition-all
                        ${maxStreams === n
                          ? 'bg-orange-500 text-white'
                          : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700 hover:text-white'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {isRoomOpen && roomId && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Pantalla</span>
                  <a href={`${window.location.origin}/stage/${roomId}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-bold text-orange-500 hover:underline"
                  >Abrir proyector →</a>
                </div>
              )}
            </div>
          </div>

          {/* Filter / Effects panel */}
          <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              <Sliders className="w-4 h-4" /> Efecto Visual
            </h3>

            {/* Filter selector */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'none' as FilterId,  label: 'Sin filtro', emoji: '◯', desc: 'Video natural' },
                { id: 'retro' as FilterId, label: 'Retro B&W',  emoji: '🎞', desc: 'Cámara clásica' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => handleSetFilter(f.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all text-center
                    ${activeFilter === f.id
                      ? 'border-orange-500 bg-orange-500/10 text-white shadow-[0_0_12px_rgba(249,115,22,0.2)]'
                      : 'border-neutral-800 bg-neutral-900/40 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300'}`}
                >
                  <span className="text-xl">{f.emoji}</span>
                  <span className="text-[11px] font-black uppercase tracking-wider">{f.label}</span>
                  <span className="text-[9px] opacity-60">{f.desc}</span>
                </button>
              ))}
            </div>

            {/* Party name input — shown when retro is active */}
            {activeFilter === 'retro' && (
              <div className="space-y-2 pt-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">
                  Nombre del evento
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={partyNameInput}
                    onChange={e => setPartyNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleApplyPartyName(); }}
                    maxLength={20}
                    placeholder={partyName || 'ej: DESORDEN'}
                    className="flex-1 bg-neutral-950 border border-neutral-700 text-white font-bold uppercase text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-orange-500 tracking-wider placeholder:text-neutral-600 placeholder:normal-case"
                  />
                  <button
                    onClick={handleApplyPartyName}
                    className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black rounded-xl transition-all"
                  >
                    OK
                  </button>
                </div>
                {partyName && (
                  <p className="text-[10px] text-orange-400/70 font-bold">
                    HUD: {partyName.toUpperCase()} CAM
                  </p>
                )}
              </div>
            )}
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

        {/* Right column */}
        <div className="xl:col-span-9 flex flex-col gap-8">

          {/* Projector preview */}
          <div className={`relative aspect-video rounded-[2rem] overflow-hidden border-2 transition-all duration-700
            ${selectedIdentities.length > 0 ? 'border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.15)] ring-4 ring-orange-500/20' : 'border-neutral-800'}`}
          >
            <ProjectorPreview
              selectedParticipants={selectedParticipants}
              qrUrl={qrCodeUrl}
              activeFilter={activeFilter}
              partyName={partyName}
            />

            {/* Preview label */}
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white/50 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10 pointer-events-none">
              Vista Proyector
            </div>
          </div>

          {/* Incoming streams grid */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                Incoming Streams
                <span className="text-[10px] bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">{participants.length}</span>
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                <div className={`w-2 h-2 rounded-full ${selectedIdentities.length >= maxStreams ? 'bg-orange-500' : 'bg-neutral-700'}`} />
                {selectedIdentities.length}/{maxStreams} en proyector
              </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 pr-2">
              <AnimatePresence>
                {participants.length === 0 && isRoomOpen && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="col-span-full border-2 border-dashed border-neutral-800 rounded-[2rem] flex flex-col items-center justify-center p-12 text-center h-48 bg-neutral-900/30"
                  >
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4 text-neutral-500">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-bold text-neutral-400 mb-2">Esperando conexiones...</p>
                    <p className="text-[11px] text-neutral-600">Pedí a los invitados que escaneen el QR.</p>
                  </motion.div>
                )}

                {participants.map((participant, index) => (
                  <GuestVideoCard
                    key={participant.identity}
                    participant={participant}
                    index={index}
                    selectionIndex={selectedIdentities.includes(participant.identity)
                      ? selectedIdentities.indexOf(participant.identity)
                      : null}
                    disabled={selectedIdentities.length >= maxStreams && !selectedIdentities.includes(participant.identity)}
                    onSelect={() => handleProjectStream(participant.identity)}
                    onRemove={() => handleRemoveStream(participant.identity)}
                  />
                ))}
              </AnimatePresence>

              {isRoomOpen && participants.length > 0 && participants.length < 8 && (
                <motion.div layout className="border-2 border-dashed border-neutral-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-neutral-700 hover:text-neutral-500 hover:border-neutral-700 transition-all cursor-pointer min-h-[120px] bg-neutral-900/10">
                  <Users className="w-6 h-6 opacity-20" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Slot disponible</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* ── Projector preview blobs ── */
        .pv-blob { position:absolute; border-radius:50%; filter:blur(60px); opacity:0.2; will-change:transform; }
        .pv-b1 { width:60%; height:150%; background:radial-gradient(circle,#f97316,transparent 70%); top:-30%; left:-15%; animation:pvb1 18s ease-in-out infinite alternate; }
        .pv-b2 { width:55%; height:140%; background:radial-gradient(circle,#e11d48,transparent 70%); bottom:-30%; right:-10%; animation:pvb2 22s ease-in-out infinite alternate; }
        .pv-b3 { width:40%; height:100%; background:radial-gradient(circle,#ea580c,transparent 70%); top:30%; left:30%; animation:pvb3 26s ease-in-out infinite alternate; opacity:0.1; }
        @keyframes pvb1 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(8%,-8%) scale(1.1)} 100%{transform:translate(-5%,10%) scale(0.95)} }
        @keyframes pvb2 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-10%,8%) scale(1.08)} 100%{transform:translate(6%,-10%) scale(0.96)} }
        @keyframes pvb3 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(12%,-6%) scale(1.12)} 100%{transform:translate(-8%,5%) scale(0.9)} }

        /* Rotate portrait stream to fill 16:9 landscape card (guest grid) */
        .card-video { position:absolute; top:50%; left:50%; width:56.25%; height:177.78%; transform:translate(-50%,-50%) rotate(90deg); object-fit:cover; }
        @keyframes lcPulse { 0%,100%{opacity:1} 50%{opacity:0.2} }

        .custom-scrollbar::-webkit-scrollbar { width:4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:#262626; border-radius:10px; }
      `}</style>
    </div>
  );
};

export default LiveControl;
