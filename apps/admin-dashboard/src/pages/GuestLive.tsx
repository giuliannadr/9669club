import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Video, AlertCircle, FlipHorizontal, Zap, ZapOff, Sliders, X, Check } from 'lucide-react';
import {
  Room,
  RoomEvent,
  LocalVideoTrack,
  LocalAudioTrack,
  createLocalVideoTrack,
  createLocalAudioTrack,
} from 'livekit-client';

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL ?? '';

type FacingMode = 'environment' | 'user';
type FilterId = 'none' | 'retro';

// ── Filter catalog (add new entries here for more filters) ──────────────────
const FILTERS: { id: FilterId; label: string; description: string; emoji: string }[] = [
  { id: 'none',  label: 'Sin filtro',  description: 'Video natural',          emoji: '◯' },
  { id: 'retro', label: 'Retro B&W',   description: 'Cámara de cine clásica', emoji: '🎞' },
];

// ── Film grain canvas overlay (CSS only — no video quality loss) ────────────
const GrainCanvas: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width  = 180;
    canvas.height = 320;
    let raf: number;
    let tick = 0;
    const draw = () => {
      // Update grain at ~15fps to stay lightweight on mobile
      if (tick++ % 4 === 0) {
        const d = ctx.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < d.data.length; i += 4) {
          const v = (Math.random() * 255) | 0;
          d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
          d.data[i + 3] = 28; // very subtle alpha
        }
        ctx.putImageData(d, 0, 0);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.22, mixBlendMode: 'overlay', zIndex: 8 }}
    />
  );
};

// ── Retro camera HUD overlay ─────────────────────────────────────────────────
const RetroCameraHUD: React.FC<{
  partyName: string;
  isLive: boolean;
  liveTime: number;
}> = ({ partyName, isLive, liveTime }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timecode = (() => {
    const s = liveTime;
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  })();

  const clockStr = now.toTimeString().slice(0, 8);
  const name = (partyName || 'EVENT').toUpperCase();

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10" style={{ fontFamily: 'monospace' }}>

      {/* ── Vignette ── */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)',
      }} />

      {/* ── Grain ── */}
      <GrainCanvas />

      {/* ── Viewfinder corner brackets ── */}
      {[
        { top: '10%', left: '5%',  borderTop: '2px solid rgba(255,255,255,0.7)', borderLeft: '2px solid rgba(255,255,255,0.7)' },
        { top: '10%', right: '5%', borderTop: '2px solid rgba(255,255,255,0.7)', borderRight: '2px solid rgba(255,255,255,0.7)' },
        { bottom: '10%', left: '5%',  borderBottom: '2px solid rgba(255,255,255,0.7)', borderLeft: '2px solid rgba(255,255,255,0.7)' },
        { bottom: '10%', right: '5%', borderBottom: '2px solid rgba(255,255,255,0.7)', borderRight: '2px solid rgba(255,255,255,0.7)' },
      ].map((s, i) => (
        <div key={i} className="absolute" style={{ width: 22, height: 22, ...s }} />
      ))}

      {/* ── Center focus cross ── */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <div style={{ width: 28, height: 28, position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'white' }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'white' }} />
        </div>
      </div>

      {/* ── TOP BAR ── */}
      <div className="absolute top-0 left-0 right-0 px-3 pt-2 flex justify-between items-start"
        style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', lineHeight: 1.35 }}>

        {/* Top-left block */}
        <div>
          <div className="flex gap-2">
            <span>RKT MODE</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>▌▌▌▌▌</span>
            <span>SEÑAL 100%</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)' }}>AUTO</div>
          <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
            <span style={{ fontSize: 8, border: '1px solid rgba(255,255,255,0.4)', padding: '0 2px' }}>▶</span>
            <span>{name} CAME</span>
          </div>
        </div>

        {/* Top-center: timecode */}
        <div className="flex flex-col items-center">
          <div style={{
            border: '1px solid rgba(255,255,255,0.4)',
            padding: '2px 6px',
            letterSpacing: '0.1em',
            fontSize: 13,
            fontWeight: 700,
          }}>
            {isLive ? timecode : '00:00:00'}
          </div>
          {isLive && (
            <div className="flex items-center gap-1 mt-0.5" style={{ fontSize: 7, color: 'rgba(255,50,50,0.9)' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,50,50,0.9)', display: 'inline-block', animation: 'pulse 1s infinite' }} />
              REC
            </div>
          )}
        </div>

        {/* Top-right: party cam */}
        <div className="text-right">
          <div style={{ fontWeight: 700, letterSpacing: '0.05em' }}>{name} CAM</div>
          <div style={{ color: 'rgba(255,255,255,0.5)' }}>-0.8 <span style={{ letterSpacing: '-1px' }}>▌▌▌▌▌</span></div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8 }}>
            {'       '}-0.8
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 flex justify-between items-end"
        style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>

        {/* Bottom-left */}
        <div>
          <div style={{ color: 'rgba(255,255,255,0.5)' }}>RKT</div>
          <div style={{
            border: '1px solid rgba(255,255,255,0.45)',
            padding: '0 3px',
            display: 'inline-block',
            color: 'rgba(255,255,255,0.6)',
          }}>TOUR</div>
          <div style={{ color: 'rgba(255,255,255,0.5)' }}>PISTA ON</div>
          <div style={{ color: 'rgba(255,255,255,0.5)' }}>AWB</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8 }}>
            RKT LVL <span style={{ letterSpacing: '-1px' }}>▌▌▌▌▌▌▌▌▌▌</span>
          </div>
        </div>

        {/* Bottom-center: real clock */}
        <div className="text-center">
          <div style={{ fontSize: 8, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.45)' }}>AFTER TIME</div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.08em' }}>{clockStr}</div>
        </div>

        {/* Bottom-right */}
        <div className="text-right" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <div>BPM 150</div>
          <div>1/200</div>
        </div>
      </div>

      {/* ── Horizontal scan line ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
        zIndex: 9,
      }} />
    </div>
  );
};

// ── Filter picker sheet ───────────────────────────────────────────────────────
const FilterPicker: React.FC<{
  current: FilterId;
  onSelect: (id: FilterId) => void;
  onClose: () => void;
}> = ({ current, onSelect, onClose }) => (
  <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
    <div
      className="w-full bg-neutral-900 border-t border-neutral-700 rounded-t-3xl p-6"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-5">
        <p className="text-white font-black text-sm uppercase tracking-widest">Efectos</p>
        <button onClick={onClose} className="p-1.5 text-neutral-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => onSelect(f.id)}
            className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all
              ${current === f.id
                ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                : 'border-neutral-700 bg-neutral-800 hover:border-neutral-500'}`}
          >
            {current === f.id && (
              <div className="absolute top-2 right-2 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
            )}
            <span className="text-2xl">{f.emoji}</span>
            <span className="text-white font-bold text-xs">{f.label}</span>
            <span className="text-neutral-500 text-[10px] text-center">{f.description}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// ── Party name modal ──────────────────────────────────────────────────────────
const PartyNameModal: React.FC<{
  initial: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}> = ({ initial, onConfirm, onCancel }) => {
  const [value, setValue] = useState(initial);
  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-6 w-full max-w-xs">
        <p className="text-white font-black text-sm uppercase tracking-widest mb-1">Nombre del evento</p>
        <p className="text-neutral-500 text-xs mb-4">Aparecerá en el HUD como "{(value || 'EVENTO').toUpperCase()} CAM"</p>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onConfirm(value); }}
          maxLength={20}
          placeholder="ej: DESORDEN"
          className="w-full bg-neutral-800 border border-neutral-600 text-white font-bold uppercase text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 tracking-wider placeholder:text-neutral-600 placeholder:normal-case"
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-400 text-sm font-bold">
            Cancelar
          </button>
          <button onClick={() => onConfirm(value)}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-black">
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main GuestLive ────────────────────────────────────────────────────────────
const GuestLive: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [liveTime, setLiveTime] = useState(0);
  const [showPermissionModal, setShowPermissionModal] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signalBars, setSignalBars] = useState(4);
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<FilterId>('none');
  const [partyName, setPartyName] = useState('');
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingFilter, setPendingFilter] = useState<FilterId>('none');

  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<LocalVideoTrack | null>(null);
  const localAudioRef = useRef<LocalAudioTrack | null>(null);
  const guestId = useRef(`guest_${Math.random().toString(36).substring(2, 9)}`);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: number;
    if (isLive) interval = setInterval(() => setLiveTime(t => t + 1), 1000);
    else setLiveTime(0);
    return () => clearInterval(interval);
  }, [isLive]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => setSignalBars(Math.floor(Math.random() * 2) + 3), 1500);
    return () => clearInterval(interval);
  }, [isLive]);

  const checkTorchSupport = (track: LocalVideoTrack) => {
    const caps = track.mediaStreamTrack.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
    setTorchSupported(!!caps?.torch);
  };

  const attachVideoTrack = useCallback((track: LocalVideoTrack) => {
    if (videoRef.current) track.attach(videoRef.current);
  }, []);

  const requestPermissions = async () => {
    setError(null);
    try {
      const videoTrack = await createLocalVideoTrack({ facingMode });
      const audioTrack = await createLocalAudioTrack();
      localVideoRef.current = videoTrack;
      localAudioRef.current = audioTrack;
      setHasPermissions(true);
      setShowPermissionModal(false);
      setTimeout(() => attachVideoTrack(videoTrack), 50);
      checkTorchSupport(videoTrack);
    } catch {
      setHasPermissions(false);
    }
  };

  const flipCamera = async () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setTorchOn(false);
    const newFacing: FacingMode = facingMode === 'environment' ? 'user' : 'environment';
    const oldTrack = localVideoRef.current;
    try {
      if (roomRef.current && oldTrack) await roomRef.current.localParticipant.unpublishTrack(oldTrack);
      oldTrack?.stop();
      localVideoRef.current = null;
      const newTrack = await createLocalVideoTrack({ facingMode: newFacing });
      localVideoRef.current = newTrack;
      if (roomRef.current) await roomRef.current.localParticipant.publishTrack(newTrack);
      attachVideoTrack(newTrack);
      checkTorchSupport(newTrack);
      setFacingMode(newFacing);
    } catch (err) {
      console.error('Error flipping camera:', err);
    } finally {
      setIsFlipping(false);
    }
  };

  const toggleTorch = async () => {
    const track = localVideoRef.current?.mediaStreamTrack;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn(prev => !prev);
    } catch (err) {
      console.error('Torch not supported:', err);
    }
  };

  const startLive = async () => {
    if (!LIVEKIT_URL) { setError('LiveKit no está configurado.'); return; }
    setError(null);
    try {
      const res = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, identity: guestId.current, role: 'guest' }),
      });
      if (!res.ok) throw new Error('Token error');
      const { token } = await res.json();
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      room.on(RoomEvent.Disconnected, () => setIsLive(false));
      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload));
          if (msg.type === 'ROOM_CLOSED') {
            roomRef.current?.disconnect();
            roomRef.current = null;
            localVideoRef.current?.stop();
            localVideoRef.current = null;
            localAudioRef.current?.stop();
            localAudioRef.current = null;
            setIsLive(false);
            setRoomClosed(true);
          }
        } catch { /* ignore */ }
      });
      await room.connect(LIVEKIT_URL, token);
      if (localVideoRef.current) await room.localParticipant.publishTrack(localVideoRef.current);
      if (localAudioRef.current) await room.localParticipant.publishTrack(localAudioRef.current);
      setIsLive(true);
    } catch (err) {
      setError('No se pudo conectar. Verificá tu conexión.');
      console.error(err);
    }
  };

  const stopLive = () => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setIsLive(false);
  };

  // ── Filter selection flow ─────────────────────────────────────────────────
  const handleFilterSelect = (id: FilterId) => {
    setShowFilterPicker(false);
    if (id === 'none') {
      setActiveFilter('none');
      return;
    }
    if (id === 'retro') {
      setPendingFilter('retro');
      setShowNameModal(true);
    }
  };

  const handleNameConfirm = (name: string) => {
    setPartyName(name.trim() || 'EVENT');
    setActiveFilter(pendingFilter);
    setShowNameModal(false);
  };

  useEffect(() => {
    const handleUnload = () => roomRef.current?.disconnect();
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      roomRef.current?.disconnect();
      localVideoRef.current?.stop();
      localAudioRef.current?.stop();
    };
  }, []);

  // CSS filter applied to video element (no quality loss — pure rendering)
  const videoFilter = activeFilter === 'retro'
    ? 'grayscale(1) contrast(1.08) brightness(0.88)'
    : 'none';

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col font-sans overflow-hidden">

      {/* Camera Viewport */}
      <div className="absolute inset-0 bg-neutral-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            display: hasPermissions ? 'block' : 'none',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            // CSS-only color grading — does NOT affect the transmitted stream quality
            filter: videoFilter,
          }}
        />

        {!hasPermissions && (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
            <Video className="w-16 h-16 mb-4" />
            <p className="font-bold tracking-widest uppercase text-sm">Cámara Inactiva</p>
          </div>
        )}

        {/* Framing corners (natural mode) */}
        {hasPermissions && activeFilter === 'none' && (
          <div className="absolute inset-6 pointer-events-none opacity-40 mix-blend-overlay">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/80" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/80" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/80" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/80" />
          </div>
        )}

        {/* Retro camera HUD */}
        {hasPermissions && activeFilter === 'retro' && (
          <RetroCameraHUD partyName={partyName} isLive={isLive} liveTime={liveTime} />
        )}
      </div>

      {/* UI overlay */}
      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        {/* Header */}
        <div className="flex items-start justify-between p-6 bg-gradient-to-b from-black/80 to-transparent pb-12 pointer-events-auto">
          <div>
            <h1 className="text-xl font-black tracking-tight drop-shadow-md">
              LIVE<span className="text-orange-500">CONTROL</span>
            </h1>
            <p className="text-xs font-bold text-neutral-300 drop-shadow uppercase tracking-widest opacity-80 mt-1">
              SALA: {roomId?.split('_')[1] || roomId}
            </p>
          </div>

          {hasPermissions && (
            <div className="flex items-center gap-2">
              {/* Torch */}
              {torchSupported && facingMode === 'environment' && (
                <button onClick={toggleTorch}
                  className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                    torchOn ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400' : 'bg-black/40 border-white/10 text-white'}`}
                >
                  {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
                </button>
              )}

              {/* Filter picker button */}
              <button
                onClick={() => setShowFilterPicker(true)}
                className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                  activeFilter !== 'none'
                    ? 'bg-orange-500/20 border-orange-500/60 text-orange-400'
                    : 'bg-black/40 border-white/10 text-white'}`}
              >
                <Sliders className="w-5 h-5" />
              </button>

              {/* Flip camera */}
              <button onClick={flipCamera} disabled={isFlipping}
                className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white disabled:opacity-50 transition-all active:scale-90">
                <FlipHorizontal className={`w-5 h-5 ${isFlipping ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* Live indicator */}
        {isLive && (
          <div className="flex justify-center pointer-events-none">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-xl">
              <div className="flex items-center gap-1.5 text-rose-500 font-black text-[10px] tracking-widest uppercase">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(243,24,63,0.8)]" />
                EN VIVO
              </div>
              <div className="w-px h-3 bg-white/20" />
              <div className="text-white font-mono text-xs font-bold tracking-wider">{formatTime(liveTime)}</div>
              <div className="w-px h-3 bg-white/20" />
              <div className="flex items-end gap-[2px] h-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`w-1 rounded-sm transition-all duration-300 ${i <= signalBars ? 'bg-green-500' : 'bg-white/20'}`}
                    style={{ height: `${i * 25}%` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* Footer Controls */}
        <div className="flex flex-col items-center justify-end p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-24 pointer-events-auto">
          {error && (
            <div className="mb-6 flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold px-4 py-2 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={isLive ? stopLive : startLive}
            disabled={!hasPermissions}
            className={`
              relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300
              ${!hasPermissions ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer hover:scale-105 active:scale-95'}
              ${isLive ? 'bg-transparent border-[3px] border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)]' : 'bg-white border-[6px] border-white/20'}
            `}
            style={isLive ? { animation: 'glow-pulse 2s infinite alternate' } : {}}
          >
            {isLive ? (
              <div className="w-8 h-8 bg-orange-500 rounded-sm shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
            ) : (
              <div className="absolute inset-0 m-auto w-[68px] h-[68px] bg-rose-600 rounded-full flex items-center justify-center">
                <span className="text-white font-black text-xs tracking-widest uppercase">REC</span>
              </div>
            )}
            {isLive && <div className="absolute inset-0 rounded-full border border-orange-500/50 animate-ping opacity-30" />}
          </button>

          {!isLive && hasPermissions && (
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-6">Toca para transmitir</p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes glow-pulse {
          0%   { box-shadow: 0 0 10px rgba(249,115,22,0.3); border-color: rgba(249,115,22,0.6); }
          100% { box-shadow: 0 0 30px rgba(249,115,22,0.8), inset 0 0 10px rgba(249,115,22,0.4); border-color: rgba(249,115,22,1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>

      {/* ── Room Closed ── */}
      {roomClosed && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-neutral-900 border border-neutral-800 rounded-full flex items-center justify-center mx-auto mb-8">
            <div className="w-6 h-6 bg-neutral-600 rounded-sm" />
          </div>
          <p className="text-white text-3xl font-black tracking-tight mb-3">Sala Cerrada</p>
          <p className="text-neutral-500 text-sm leading-relaxed max-w-xs">
            El administrador cerró la transmisión. ¡Gracias por participar!
          </p>
          <div className="mt-10 text-neutral-700 font-black tracking-[0.3em] text-sm">
            9669<span className="text-orange-500/50">.STUDIO</span>
          </div>
        </div>
      )}

      {/* ── Permissions Modal ── */}
      {showPermissionModal && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Video className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
              Convertite en el<br />Camarógrafo
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed mb-8">
              Para transmitir en vivo a la pantalla grande, necesitamos acceso a tu cámara y micrófono.
            </p>
            <button onClick={requestPermissions}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all shadow-lg shadow-orange-500/25">
              Permitir Acceso
            </button>
            {hasPermissions === false && (
              <p className="text-xs text-rose-500 font-bold mt-4 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Permisos denegados. Revisá los ajustes.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Filter Picker ── */}
      {showFilterPicker && (
        <FilterPicker
          current={activeFilter}
          onSelect={handleFilterSelect}
          onClose={() => setShowFilterPicker(false)}
        />
      )}

      {/* ── Party Name Modal ── */}
      {showNameModal && (
        <PartyNameModal
          initial={partyName}
          onConfirm={handleNameConfirm}
          onCancel={() => setShowNameModal(false)}
        />
      )}
    </div>
  );
};

export default GuestLive;
