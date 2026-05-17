import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrack,
  Track,
  ParticipantEvent,
} from 'livekit-client';

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL ?? '';

const readSelectedIdentity = (participant: RemoteParticipant | undefined): string | null => {
  if (!participant?.metadata) return null;
  try {
    return JSON.parse(participant.metadata).selectedIdentity ?? null;
  } catch {
    return null;
  }
};

const StageVideo: React.FC<{ participant: RemoteParticipant }> = ({ participant }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
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
      className="w-full h-full object-contain"
    />
  );
};

// ── Animated background blobs ────────────────────────────────────────────────
const AnimatedBg: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden bg-[#080808]">
    <div className="blob blob-1" />
    <div className="blob blob-2" />
    <div className="blob blob-3" />
    <div className="blob blob-4" />
    {/* Subtle grid overlay */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }}
    />
  </div>
);

// ── QR corner badge ──────────────────────────────────────────────────────────
const QRCorner: React.FC<{ qrUrl: string; guestUrl: string }> = ({ qrUrl, guestUrl }) => (
  <div className="absolute bottom-8 right-8 pointer-events-none flex flex-col items-center gap-2">
    <div className="bg-white p-2 rounded-xl shadow-2xl">
      <img src={qrUrl} alt="QR" className="w-24 h-24 block" />
    </div>
    <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em] text-center">
      {guestUrl.replace(/^https?:\/\//, '')}
    </p>
  </div>
);

// ── Waiting screen (no stream selected) ─────────────────────────────────────
const WaitingScreen: React.FC<{ isConnected: boolean; qrUrl: string; guestUrl: string }> = ({
  isConnected,
  qrUrl,
  guestUrl,
}) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
    {/* Top brand */}
    <div className="absolute top-10 left-1/2 -translate-x-1/2">
      <p className="text-white/20 font-black tracking-[0.5em] text-sm uppercase">
        9669<span className="text-orange-500/40">.STUDIO</span>
      </p>
    </div>

    {/* Center content */}
    <div className="flex flex-col items-center gap-10 px-16 text-center">
      {/* QR grande al centro */}
      {isConnected && qrUrl && (
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-orange-500/30 to-rose-500/20 blur-xl animate-pulse" />
            <div className="relative bg-white p-5 rounded-[1.5rem] shadow-[0_0_80px_rgba(249,115,22,0.2)]">
              <img src={qrUrl} alt="QR Code" className="w-64 h-64 block" />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-white font-black text-4xl tracking-tight leading-tight">
              ESCANEÁ<br />
              <span className="text-orange-500">&amp; SÉ PARTE</span>
            </p>
            <p className="text-white/40 text-base tracking-[0.3em] uppercase font-bold">
              del momento
            </p>
          </div>

          <div className="flex items-center gap-3 text-white/30 text-xs font-bold uppercase tracking-[0.3em]">
            <div className="w-8 h-px bg-white/20" />
            abrí la cámara y transmití en vivo
            <div className="w-8 h-px bg-white/20" />
          </div>

          <p className="text-white/20 text-sm font-mono tracking-wider">
            {guestUrl.replace(/^https?:\/\//, '')}
          </p>
        </div>
      )}

      {/* Connecting state */}
      {!isConnected && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-3 h-3 bg-neutral-700 rounded-full animate-pulse" />
          <p className="text-neutral-700 text-2xl font-black uppercase tracking-[0.4em]">
            Conectando...
          </p>
        </div>
      )}
    </div>

    {/* Bottom status dot */}
    {isConnected && (
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        <p className="text-white/20 text-xs font-bold uppercase tracking-widest">
          En espera de señal
        </p>
      </div>
    )}
  </div>
);

// ── Main StageView ───────────────────────────────────────────────────────────
const StageView: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [participants, setParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);

  const guestUrl = roomId
    ? `${window.location.origin}/live/${roomId}`
    : '';
  const qrUrl = guestUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(guestUrl)}&color=0-0-0&bgcolor=FFFFFF`
    : '';

  useEffect(() => {
    if (!roomId || !LIVEKIT_URL) {
      setError('Sala no encontrada o LiveKit no configurado.');
      return;
    }

    const connect = async () => {
      try {
        const res = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, identity: 'stage', role: 'stage' }),
        });

        if (!res.ok) throw new Error('Token error');
        const { token } = await res.json();

        const room = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;

        room.on(RoomEvent.Connected, () => setIsConnected(true));
        room.on(RoomEvent.Disconnected, () => setIsConnected(false));

        room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
          if (p.identity !== 'admin') {
            setParticipants(prev => new Map(prev).set(p.identity, p));
          }
        });

        room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
          setParticipants(prev => {
            const next = new Map(prev);
            next.delete(p.identity);
            return next;
          });
          setSelectedIdentity(prev => (prev === p.identity ? null : prev));
        });

        room.on(RoomEvent.TrackSubscribed, (_track, _pub, participant: RemoteParticipant) => {
          if (participant.identity !== 'admin') {
            setParticipants(prev => new Map(prev).set(participant.identity, participant));
          }
        });

        room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
          try {
            const msg = JSON.parse(new TextDecoder().decode(payload));
            if (msg.type === 'SELECT_STREAM') {
              setSelectedIdentity(msg.participantIdentity);
            }
          } catch { /* ignore */ }
        });

        room.on(RoomEvent.ParticipantMetadataChanged, (_metadata, participant) => {
          if (participant.identity === 'admin') {
            const identity = readSelectedIdentity(participant as RemoteParticipant);
            if (identity) setSelectedIdentity(identity);
          }
        });

        await room.connect(LIVEKIT_URL, token);

        const existing = new Map(
          Array.from(room.remoteParticipants.entries()).filter(([id]) => id !== 'admin')
        );
        setParticipants(existing);

        const tryReadAdminSelection = () => {
          const adminP = roomRef.current?.remoteParticipants.get('admin');
          const sel = readSelectedIdentity(adminP);
          if (sel) setSelectedIdentity(sel);
        };
        tryReadAdminSelection();
        setTimeout(tryReadAdminSelection, 800);
        setTimeout(tryReadAdminSelection, 2000);

      } catch (err) {
        setError('No se pudo conectar a la sala.');
        console.error(err);
      }
    };

    connect();
    return () => { roomRef.current?.disconnect(); };
  }, [roomId]);

  const selectedParticipant = selectedIdentity ? participants.get(selectedIdentity) ?? null : null;

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-neutral-500 text-xl font-bold uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Always-on animated background */}
      <AnimatedBg />

      {/* Video layer */}
      <div className="absolute inset-0">
        {selectedParticipant ? (
          <StageVideo participant={selectedParticipant} />
        ) : (
          <WaitingScreen isConnected={isConnected} qrUrl={qrUrl} guestUrl={guestUrl} />
        )}
      </div>

      {/* Overlays when streaming */}
      {selectedParticipant && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

          {/* ON AIR badge */}
          <div className="absolute top-6 left-6 pointer-events-none">
            <div className="bg-rose-600 text-white px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-[0_0_15px_rgba(225,29,72,0.6)]">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              ON AIR
            </div>
          </div>

          {/* Brand watermark */}
          <div className="absolute bottom-8 left-10 opacity-25 pointer-events-none">
            <p className="text-white font-black tracking-[0.3em] text-2xl drop-shadow-lg">
              9669<span className="text-orange-500">.STUDIO</span>
            </p>
          </div>

          {/* QR corner cuando hay stream */}
          {qrUrl && <QRCorner qrUrl={qrUrl} guestUrl={guestUrl} />}
        </>
      )}

      <style>{`
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.18;
          will-change: transform;
        }
        .blob-1 {
          width: 700px; height: 700px;
          background: radial-gradient(circle, #f97316, transparent 70%);
          top: -10%; left: -10%;
          animation: blob1 18s ease-in-out infinite alternate;
        }
        .blob-2 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, #e11d48, transparent 70%);
          bottom: -15%; right: -10%;
          animation: blob2 22s ease-in-out infinite alternate;
        }
        .blob-3 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #ea580c, transparent 70%);
          top: 40%; left: 35%;
          animation: blob3 26s ease-in-out infinite alternate;
          opacity: 0.10;
        }
        .blob-4 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #fb923c, transparent 70%);
          top: 10%; right: 20%;
          animation: blob4 20s ease-in-out infinite alternate;
          opacity: 0.08;
        }
        @keyframes blob1 {
          0%   { transform: translate(0px,   0px)   scale(1); }
          33%  { transform: translate(80px, -60px)  scale(1.08); }
          66%  { transform: translate(-50px, 90px)  scale(0.94); }
          100% { transform: translate(60px,  40px)  scale(1.04); }
        }
        @keyframes blob2 {
          0%   { transform: translate(0px,   0px)   scale(1); }
          33%  { transform: translate(-90px, 70px)  scale(1.06); }
          66%  { transform: translate(60px, -80px)  scale(0.96); }
          100% { transform: translate(-40px, -30px) scale(1.02); }
        }
        @keyframes blob3 {
          0%   { transform: translate(0px,  0px)   scale(1); }
          50%  { transform: translate(100px, -70px) scale(1.12); }
          100% { transform: translate(-80px, 50px)  scale(0.9); }
        }
        @keyframes blob4 {
          0%   { transform: translate(0px,   0px)   scale(1); }
          50%  { transform: translate(-60px, 100px) scale(1.08); }
          100% { transform: translate(70px, -50px)  scale(0.95); }
        }
      `}</style>
    </div>
  );
};

export default StageView;
