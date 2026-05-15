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
    if (isLive) {
      interval = setInterval(() => setLiveTime(t => t + 1), 1000);
    } else {
      setLiveTime(0);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setSignalBars(Math.floor(Math.random() * 2) + 3);
    }, 1500);
    return () => clearInterval(interval);
  }, [isLive]);

  const checkTorchSupport = (track: LocalVideoTrack) => {
    const capabilities = track.mediaStreamTrack.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
    setTorchSupported(!!capabilities?.torch);
  };

  const attachVideoTrack = useCallback((track: LocalVideoTrack) => {
    if (videoRef.current) {
      track.attach(videoRef.current);
    }
  }, []);

  const requestPermissions = async () => {
    setError(null);
    try {
      const videoTrack = await createLocalVideoTrack({
        facingMode,
        resolution: { width: 1280, height: 720 },
      });
      const audioTrack = await createLocalAudioTrack();

      localVideoRef.current = videoTrack;
      localAudioRef.current = audioTrack;

      setHasPermissions(true);
      setShowPermissionModal(false);
      // Attach after state update so the video element is in the DOM
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

    try {
      const newVideoTrack = await createLocalVideoTrack({
        facingMode: newFacing,
        resolution: { width: 1280, height: 720 },
      });

      // Swap in room if live
      if (roomRef.current && localVideoRef.current) {
        await roomRef.current.localParticipant.unpublishTrack(localVideoRef.current);
        localVideoRef.current.stop();
        localVideoRef.current = newVideoTrack;
        await roomRef.current.localParticipant.publishTrack(newVideoTrack);
      } else {
        localVideoRef.current?.stop();
        localVideoRef.current = newVideoTrack;
      }

      attachVideoTrack(newVideoTrack);
      checkTorchSupport(newVideoTrack);
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
    if (!LIVEKIT_URL) {
      setError('LiveKit no está configurado.');
      return;
    }
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

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col font-sans overflow-hidden">
      {/* Camera Viewport — always rendered so ref is always available */}
      <div className="absolute inset-0 bg-neutral-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{
            display: hasPermissions ? 'block' : 'none',
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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30">
              <div className="w-4 h-[1px] bg-white absolute" />
              <div className="w-[1px] h-4 bg-white absolute" />
            </div>
          </div>
        )}
      </div>

      {/* Overlay UI */}
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

          {/* Camera controls — top right */}
          {hasPermissions && (
            <div className="flex items-center gap-2">
              {/* Torch (back camera only) */}
              {torchSupported && facingMode === 'environment' && (
                <button
                  onClick={toggleTorch}
                  className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                    torchOn
                      ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400'
                      : 'bg-black/40 border-white/10 text-white'
                  }`}
                >
                  {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
                </button>
              )}

              {/* Flip camera */}
              <button
                onClick={flipCamera}
                disabled={isFlipping}
                className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white disabled:opacity-50 transition-all active:scale-90"
              >
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
              <div className="text-white font-mono text-xs font-bold tracking-wider">
                {formatTime(liveTime)}
              </div>
              <div className="w-px h-3 bg-white/20" />
              <div className="flex items-end gap-[2px] h-3">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`w-1 rounded-sm transition-all duration-300 ${i <= signalBars ? 'bg-green-500' : 'bg-white/20'}`}
                    style={{ height: `${i * 25}%` }}
                  />
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
            {isLive && (
              <div className="absolute inset-0 rounded-full border border-orange-500/50 animate-ping opacity-30" />
            )}
          </button>

          {!isLive && hasPermissions && (
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-6">
              Toca para transmitir
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes glow-pulse {
          0% { box-shadow: 0 0 10px rgba(249,115,22,0.3); border-color: rgba(249,115,22,0.6); }
          100% { box-shadow: 0 0 30px rgba(249,115,22,0.8), inset 0 0 10px rgba(249,115,22,0.4); border-color: rgba(249,115,22,1); }
        }
      `}</style>

      {/* Room Closed Screen */}
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
            <button
              onClick={requestPermissions}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all shadow-lg shadow-orange-500/25"
            >
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
