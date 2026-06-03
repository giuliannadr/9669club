import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Video, AlertCircle, FlipHorizontal, Zap, ZapOff } from 'lucide-react';
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatTime = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

/** Try to create a video track at the given resolution, fall back gracefully */
async function createBestVideoTrack(facingMode: FacingMode): Promise<LocalVideoTrack> {
  const attempts = [
    { facingMode, resolution: { width: 1920, height: 1080, frameRate: 30 } },
    { facingMode, resolution: { width: 1280, height: 720,  frameRate: 30 } },
    { facingMode },
  ];
  for (const opts of attempts) {
    try { return await createLocalVideoTrack(opts); } catch { /* try next */ }
  }
  throw new Error('No se pudo acceder a la cámara');
}

// ── Main GuestLive ────────────────────────────────────────────────────────────
const GuestLive: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();

  // permissions / camera
  const [hasPermissions, setHasPermissions]     = useState<boolean | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(true);
  const [facingMode, setFacingMode]             = useState<FacingMode>('environment');
  const [isFlipping, setIsFlipping]             = useState(false);
  const [torchOn, setTorchOn]                   = useState(false);
  const [torchSupported, setTorchSupported]     = useState(false);

  // zoom
  const [zoom, setZoom]                 = useState(1);
  const [zoomMin, setZoomMin]           = useState(1);
  const [zoomMax, setZoomMax]           = useState(1);
  const [hasHardwareZoom, setHasHardwareZoom] = useState(false);

  // refs for pinch-to-zoom (avoid stale closures in native event listeners)
  const zoomRef    = useRef(1);
  const zoomMinRef = useRef(1);
  const zoomMaxRef = useRef(1);
  const viewportRef = useRef<HTMLDivElement>(null);

  // live state
  const [isLive, setIsLive]         = useState(false);
  const [liveTime, setLiveTime]     = useState(0);
  const [signalBars, setSignalBars] = useState(4);
  const [isOnScreen, setIsOnScreen] = useState(false); // admin selected us for projection
  const [error, setError]           = useState<string | null>(null);
  const [roomClosed, setRoomClosed] = useState(false);

  const videoRef       = useRef<HTMLVideoElement>(null);
  const roomRef        = useRef<Room | null>(null);
  const localVideoRef  = useRef<LocalVideoTrack | null>(null);
  const localAudioRef  = useRef<LocalAudioTrack | null>(null);
  const guestId        = useRef(`guest_${Math.random().toString(36).substring(2, 9)}`);

  // ── Timers ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let t: number;
    if (isLive) t = setInterval(() => setLiveTime(n => n + 1), 1000);
    else setLiveTime(0);
    return () => clearInterval(t);
  }, [isLive]);

  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(() => setSignalBars(Math.floor(Math.random() * 2) + 3), 1500);
    return () => clearInterval(t);
  }, [isLive]);

  // ── Camera helpers ──────────────────────────────────────────────────────────
  const attachVideoTrack = useCallback((track: LocalVideoTrack) => {
    if (videoRef.current) track.attach(videoRef.current);
  }, []);

  const readTrackCaps = (track: LocalVideoTrack) => {
    const caps = track.mediaStreamTrack.getCapabilities?.() as
      MediaTrackCapabilities & { torch?: boolean; zoom?: { min: number; max: number; step: number } };
    setTorchSupported(!!caps?.torch);
    if (caps?.zoom) {
      setHasHardwareZoom(true);
      setZoomMin(caps.zoom.min);
      setZoomMax(caps.zoom.max);
      zoomMinRef.current = caps.zoom.min;
      zoomMaxRef.current = caps.zoom.max;
    } else {
      setHasHardwareZoom(false);
      setZoomMin(1);
      setZoomMax(1);
      zoomMinRef.current = 1;
      zoomMaxRef.current = 1;
    }
  };

  const requestPermissions = async () => {
    setError(null);
    try {
      const videoTrack = await createBestVideoTrack(facingMode);
      const audioTrack = await createLocalAudioTrack();
      localVideoRef.current = videoTrack;
      localAudioRef.current = audioTrack;
      setHasPermissions(true);
      setShowPermissionModal(false);
      setTimeout(() => attachVideoTrack(videoTrack), 50);
      readTrackCaps(videoTrack);
    } catch {
      setHasPermissions(false);
    }
  };

  // ── Zoom ────────────────────────────────────────────────────────────────────
  const applyZoom = useCallback(async (value: number) => {
    const min = zoomMinRef.current;
    const max = zoomMaxRef.current;
    const clamped = Math.max(min, Math.min(max, value));
    zoomRef.current = clamped;
    setZoom(clamped);
    const mst = localVideoRef.current?.mediaStreamTrack;
    if (!mst) return;
    try {
      await mst.applyConstraints({ advanced: [{ zoom: clamped } as MediaTrackConstraintSet] });
    } catch { /* device doesn't support zoom */ }
  }, []);

  // Keep refs in sync with state
  useEffect(() => { zoomMinRef.current = zoomMin; }, [zoomMin]);
  useEffect(() => { zoomMaxRef.current = zoomMax; }, [zoomMax]);

  // Preset zoom buttons filtered to device range
  const zoomPresets = (() => {
    const candidates = [0.5, 1, 2, 3];
    return candidates.filter(v => {
      if (v === 1) return true;
      if (!hasHardwareZoom) return false;
      return v >= zoomMin && v <= zoomMax;
    });
  })();

  // ── Pinch-to-zoom (native listener — passive:false to prevent page scroll) ──
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !hasPermissions) return;

    let startDist: number | null = null;
    let startZoom = 1;

    const getDist = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = getDist(e.touches);
        startZoom = zoomRef.current;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist !== null) {
        e.preventDefault();
        const scale = getDist(e.touches) / startDist;
        applyZoom(startZoom * scale);
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) startDist = null;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  }, [hasPermissions, applyZoom]);

  // ── Torch ───────────────────────────────────────────────────────────────────
  const toggleTorch = async () => {
    const mst = localVideoRef.current?.mediaStreamTrack;
    if (!mst) return;
    try {
      await mst.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn(p => !p);
    } catch { /* not supported */ }
  };

  // ── Flip camera ─────────────────────────────────────────────────────────────
  const flipCamera = async () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setTorchOn(false);
    setZoom(1);
    const newFacing: FacingMode = facingMode === 'environment' ? 'user' : 'environment';
    const old = localVideoRef.current;
    try {
      if (roomRef.current && old) await roomRef.current.localParticipant.unpublishTrack(old);
      old?.stop();
      localVideoRef.current = null;
      const newTrack = await createBestVideoTrack(newFacing);
      localVideoRef.current = newTrack;
      if (roomRef.current) await roomRef.current.localParticipant.publishTrack(newTrack);
      attachVideoTrack(newTrack);
      readTrackCaps(newTrack);
      setFacingMode(newFacing);
    } catch (err) {
      console.error('Error flipping camera:', err);
    } finally {
      setIsFlipping(false);
    }
  };

  // ── Go live ──────────────────────────────────────────────────────────────────
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

      const room = new Room({
        // ── Quality settings: publish the highest quality possible ──
        adaptiveStream: false,   // don't reduce quality based on how small video is rendered
        dynacast: false,         // don't simulcast lower-quality layers
        publishDefaults: {
          simulcast: false,
          videoEncoding: {
            maxBitrate:   5_000_000,  // 5 Mbps
            maxFramerate: 30,
          },
        },
      });
      roomRef.current = room;

      room.on(RoomEvent.Disconnected, () => { setIsLive(false); setIsOnScreen(false); });

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
            setIsOnScreen(false);
            setRoomClosed(true);
          }

          // Admin seleccionó / deseleccionó esta cámara para proyectar
          if (msg.type === 'ON_SCREEN' && msg.identity === guestId.current) {
            setIsOnScreen(true);
          }
          if (msg.type === 'OFF_SCREEN' && msg.identity === guestId.current) {
            setIsOnScreen(false);
          }
        } catch { /* ignore */ }
      });

      await room.connect(LIVEKIT_URL, token);
      if (localVideoRef.current) await room.localParticipant.publishTrack(localVideoRef.current);
      if (localAudioRef.current)  await room.localParticipant.publishTrack(localAudioRef.current);
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
    setIsOnScreen(false);
  };

  useEffect(() => {
    const onUnload = () => roomRef.current?.disconnect();
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      roomRef.current?.disconnect();
      localVideoRef.current?.stop();
      localAudioRef.current?.stop();
    };
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col font-sans overflow-hidden">

      {/* Camera Viewport — pinch-to-zoom target */}
      <div ref={viewportRef} className="absolute inset-0 bg-neutral-900">
        <video
          ref={videoRef}
          autoPlay playsInline muted
          style={{
            display: hasPermissions ? 'block' : 'none',
            width: '100%', height: '100%',
            objectFit: 'cover',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
          }}
        />
        {!hasPermissions && (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
            <Video className="w-16 h-16 mb-4" />
            <p className="font-bold tracking-widest uppercase text-sm">Cámara Inactiva</p>
          </div>
        )}
        {/* Framing corners */}
        {hasPermissions && (
          <div className="absolute inset-6 pointer-events-none opacity-40 mix-blend-overlay">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/80" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/80" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/80" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/80" />
          </div>
        )}
      </div>

      {/* ── ON SCREEN NOTIFICATION ─────────────────────────────────────────── */}
      {isOnScreen && (
        <div
          className="absolute inset-x-0 top-0 z-30 flex justify-center pt-safe"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
        >
          <div
            className="mx-4 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.2)',
              animation: 'onScreenPop 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {/* Pulsing dot */}
            <div className="relative flex-shrink-0">
              <div className="w-3 h-3 bg-white rounded-full" />
              <div className="absolute inset-0 w-3 h-3 bg-white rounded-full animate-ping opacity-60" />
            </div>
            <div>
              <p className="text-white font-black text-sm tracking-wide leading-none">
                ¡Sonreí, estás en pantalla!
              </p>
              <p className="text-white/70 text-[10px] font-medium mt-0.5 tracking-wider uppercase">
                El público te está viendo
              </p>
            </div>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-col h-full pointer-events-none">

        {/* Header */}
        <div className="flex items-start justify-between p-6 bg-gradient-to-b from-black/80 to-transparent pb-12 pointer-events-auto"
          style={{ paddingTop: isOnScreen ? 'calc(max(env(safe-area-inset-top, 0px), 12px) + 72px)' : undefined }}>
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
              {torchSupported && facingMode === 'environment' && (
                <button onClick={toggleTorch}
                  className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                    torchOn ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400' : 'bg-black/40 border-white/10 text-white'}`}>
                  {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
                </button>
              )}
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
                  <div key={i}
                    className={`w-1 rounded-sm transition-all duration-300 ${i <= signalBars ? 'bg-green-500' : 'bg-white/20'}`}
                    style={{ height: `${i * 25}%` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* ── Zoom controls — iPhone style ── */}
        {hasPermissions && zoomPresets.length > 1 && (
          <div className="flex justify-center items-center gap-2 pb-5 pointer-events-auto">
            {zoomPresets.map(preset => {
              const active = Math.abs(zoom - preset) < 0.15;
              return (
                <button
                  key={preset}
                  onClick={() => applyZoom(preset)}
                  style={{
                    transition: 'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                    background: active
                      ? 'rgba(0,0,0,0.72)'
                      : 'rgba(0,0,0,0.42)',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    border: active
                      ? '1px solid rgba(255,214,0,0.35)'
                      : '1px solid rgba(255,255,255,0.15)',
                    transform: active ? 'scale(1.18)' : 'scale(1)',
                  }}
                  className="rounded-full px-3.5 py-1.5 font-bold text-sm leading-none"
                >
                  <span style={{ color: active ? '#FFD600' : 'rgba(255,255,255,0.88)' }}>
                    {preset === 0.5 ? '0.5' : preset}
                  </span>
                  <span style={{
                    fontSize: 10,
                    color: active ? '#FFD600' : 'rgba(255,255,255,0.6)',
                    marginLeft: 1,
                  }}>×</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer Controls */}
        <div className="flex flex-col items-center p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-10 pointer-events-auto">
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
              ${isLive
                ? 'bg-transparent border-[3px] border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)]'
                : 'bg-white border-[6px] border-white/20'}
            `}
            style={isLive ? { animation: 'glow-pulse 2s infinite alternate' } : {}}
          >
            {isLive
              ? <div className="w-8 h-8 bg-orange-500 rounded-sm shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
              : <div className="absolute inset-0 m-auto w-[68px] h-[68px] bg-rose-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-black text-xs tracking-widest uppercase">REC</span>
                </div>
            }
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
        @keyframes onScreenPop {
          0%   { opacity: 0; transform: translateY(-16px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>

      {/* Room Closed */}
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

      {/* Permissions Modal */}
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
    </div>
  );
};

export default GuestLive;
