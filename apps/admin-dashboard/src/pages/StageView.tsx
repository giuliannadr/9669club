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

const readSelectedIdentities = (participant: RemoteParticipant | undefined): string[] => {
  if (!participant?.metadata) return [];
  try {
    const meta = JSON.parse(participant.metadata);
    // New format: array
    if (Array.isArray(meta.selectedIdentities)) return meta.selectedIdentities;
    // Backward compat: single string
    if (typeof meta.selectedIdentity === 'string' && meta.selectedIdentity) {
      return [meta.selectedIdentity];
    }
    return [];
  } catch {
    return [];
  }
};

// ── Animated background blobs (always on) ───────────────────────────────────
const AnimatedBg: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden bg-[#080808]">
    <div className="blob blob-1" />
    <div className="blob blob-2" />
    <div className="blob blob-3" />
    <div className="blob blob-4" />
    <div
      className="absolute inset-0 opacity-[0.025]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }}
    />
  </div>
);

// ── QR corner ───────────────────────────────────────────────────────────────
const QRCorner: React.FC<{ qrUrl: string; guestUrl: string }> = ({ qrUrl, guestUrl }) => (
  <div className="absolute bottom-8 right-8 pointer-events-none flex flex-col items-center gap-2 z-20">
    <div className="bg-white p-2 rounded-xl shadow-2xl">
      <img src={qrUrl} alt="QR" className="w-24 h-24 block" />
    </div>
    <p className="text-white/30 text-[9px] font-bold uppercase tracking-[0.15em] text-center">
      {guestUrl.replace(/^https?:\/\//, '')}
    </p>
  </div>
);

// ── Phone mockup with live video ─────────────────────────────────────────────
const PhoneMockup: React.FC<{ participant: RemoteParticipant; heightVh: number }> = ({
  participant,
  heightVh,
}) => {
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

  const borderRadius = heightVh >= 78 ? 52 : heightVh >= 68 ? 46 : 40;
  const screenRadius = borderRadius - 8;

  return (
    <div
      className="phone-outer"
      style={{ height: `${heightVh}vh`, borderRadius: `${borderRadius}px` }}
    >
      {/* Volume buttons — left */}
      <div className="phone-btn" style={{ left: '-5px', top: '18%', height: '28px' }} />
      <div className="phone-btn" style={{ left: '-5px', top: '28%', height: '52px' }} />
      {/* Power button — right */}
      <div className="phone-btn" style={{ right: '-5px', top: '24%', height: '64px' }} />

      {/* Screen */}
      <div className="phone-screen" style={{ borderRadius: `${screenRadius}px` }}>
        {/* Dynamic island */}
        <div className="phone-island">
          <div className="phone-camera" />
        </div>

        {/* Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* ON AIR badge inside screen */}
        <div className="absolute top-12 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <div className="bg-rose-600/90 backdrop-blur text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 shadow-lg">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            EN VIVO
          </div>
        </div>

        {/* Home bar */}
        <div className="phone-home-bar" />
      </div>
    </div>
  );
};

// ── Waiting screen ───────────────────────────────────────────────────────────
const WaitingScreen: React.FC<{ qrUrl: string; guestUrl: string }> = ({ qrUrl, guestUrl }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center select-none z-10">
    <div className="absolute top-10 left-1/2 -translate-x-1/2">
      <p className="text-white/20 font-black tracking-[0.5em] text-sm uppercase">
        9669<span className="text-orange-500/40">.STUDIO</span>
      </p>
    </div>

    <div className="flex flex-col items-center gap-10 text-center">
      <div className="relative">
        <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-orange-500/30 to-rose-500/20 blur-2xl animate-pulse" />
        <div className="relative bg-white p-5 rounded-[1.5rem] shadow-[0_0_80px_rgba(249,115,22,0.25)]">
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

      <div className="flex items-center gap-3 text-white/25 text-xs font-bold uppercase tracking-[0.3em]">
        <div className="w-8 h-px bg-white/20" />
        abrí la cámara y transmití en vivo
        <div className="w-8 h-px bg-white/20" />
      </div>

      <p className="text-white/15 text-sm font-mono tracking-wider">
        {guestUrl.replace(/^https?:\/\//, '')}
      </p>
    </div>

    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2">
      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
      <p className="text-white/20 text-xs font-bold uppercase tracking-widest">
        En espera de señal
      </p>
    </div>
  </div>
);

// height per count
const PHONE_HEIGHTS: Record<number, number> = { 1: 78, 2: 68, 3: 55 };

// ── Main StageView ───────────────────────────────────────────────────────────
const StageView: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [participants, setParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const [selectedIdentities, setSelectedIdentities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);

  const guestUrl = roomId ? `${window.location.origin}/live/${roomId}` : '';
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

        room.on(RoomEvent.Disconnected, () => setSelectedIdentities([]));

        room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
          if (p.identity !== 'admin' && p.identity !== 'stage') {
            setParticipants(prev => new Map(prev).set(p.identity, p));
          }
        });

        room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
          setParticipants(prev => { const n = new Map(prev); n.delete(p.identity); return n; });
          setSelectedIdentities(prev => prev.filter(id => id !== p.identity));
        });

        room.on(RoomEvent.TrackSubscribed, (_t, _p, participant: RemoteParticipant) => {
          if (participant.identity !== 'admin' && participant.identity !== 'stage') {
            setParticipants(prev => new Map(prev).set(participant.identity, participant));
          }
        });

        room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
          try {
            const msg = JSON.parse(new TextDecoder().decode(payload));
            // New multi-stream format
            if (msg.type === 'SELECT_STREAMS' && Array.isArray(msg.identities)) {
              setSelectedIdentities(msg.identities);
            }
            // Backward compat: old single-stream format
            if (msg.type === 'SELECT_STREAM' && typeof msg.participantIdentity === 'string') {
              setSelectedIdentities(msg.participantIdentity ? [msg.participantIdentity] : []);
            }
          } catch { /* ignore */ }
        });

        room.on(RoomEvent.ParticipantMetadataChanged, (_m, participant) => {
          if (participant.identity === 'admin') {
            const ids = readSelectedIdentities(participant as RemoteParticipant);
            if (ids.length > 0) setSelectedIdentities(ids);
          }
        });

        await room.connect(LIVEKIT_URL, token);

        setParticipants(new Map(
          Array.from(room.remoteParticipants.entries()).filter(
            ([id]) => id !== 'admin' && id !== 'stage'
          )
        ));

        const tryReadAdmin = () => {
          const adminP = roomRef.current?.remoteParticipants.get('admin');
          const ids = readSelectedIdentities(adminP);
          if (ids.length > 0) setSelectedIdentities(ids);
        };
        tryReadAdmin();
        setTimeout(tryReadAdmin, 800);
        setTimeout(tryReadAdmin, 2000);

      } catch (err) {
        setError('No se pudo conectar a la sala.');
        console.error(err);
      }
    };

    connect();
    return () => { roomRef.current?.disconnect(); };
  }, [roomId]);

  // Resolve participant objects in selection order, skip missing ones
  const selectedParticipants = selectedIdentities
    .map(id => participants.get(id))
    .filter((p): p is RemoteParticipant => !!p);

  const count = selectedParticipants.length;
  const phoneHeight = PHONE_HEIGHTS[count] ?? 78;

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-neutral-500 text-xl font-bold uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Animated background — always on */}
      <AnimatedBg />

      {/* Content layer */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        {count > 0 ? (
          <div
            className="flex items-center justify-center"
            style={{ gap: count === 3 ? '16px' : '24px' }}
          >
            {selectedParticipants.map(p => (
              <PhoneMockup key={p.identity} participant={p} heightVh={phoneHeight} />
            ))}
          </div>
        ) : (
          <WaitingScreen qrUrl={qrUrl} guestUrl={guestUrl} />
        )}
      </div>

      {/* Persistent overlays when streaming */}
      {count > 0 && (
        <>
          {/* Brand */}
          <div className="absolute bottom-8 left-10 opacity-20 pointer-events-none z-20">
            <p className="text-white font-black tracking-[0.3em] text-xl">
              9669<span className="text-orange-500">.STUDIO</span>
            </p>
          </div>
          {/* QR corner */}
          {qrUrl && <QRCorner qrUrl={qrUrl} guestUrl={guestUrl} />}
        </>
      )}

      <style>{`
        /* ── Animated blobs ── */
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
          0%   { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(80px, -60px) scale(1.08); }
          66%  { transform: translate(-50px, 90px) scale(0.94); }
          100% { transform: translate(60px, 40px) scale(1.04); }
        }
        @keyframes blob2 {
          0%   { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(-90px, 70px) scale(1.06); }
          66%  { transform: translate(60px, -80px) scale(0.96); }
          100% { transform: translate(-40px, -30px) scale(1.02); }
        }
        @keyframes blob3 {
          0%   { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(100px, -70px) scale(1.12); }
          100% { transform: translate(-80px, 50px) scale(0.9); }
        }
        @keyframes blob4 {
          0%   { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(-60px, 100px) scale(1.08); }
          100% { transform: translate(70px, -50px) scale(0.95); }
        }

        /* ── Phone mockup ── */
        .phone-outer {
          position: relative;
          aspect-ratio: 9 / 19.5;
          background: linear-gradient(160deg, #3a3a3c 0%, #1c1c1e 40%, #2c2c2e 100%);
          padding: 9px;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.12),
            0 0 0 2px rgba(0,0,0,0.8),
            0 40px 120px rgba(0,0,0,0.9),
            0 0 60px rgba(249,115,22,0.12),
            inset 0 1px 0 rgba(255,255,255,0.18),
            inset 0 -1px 0 rgba(0,0,0,0.5);
          animation: phone-float 6s ease-in-out infinite;
        }
        @keyframes phone-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        .phone-btn {
          position: absolute;
          width: 4px;
          background: linear-gradient(180deg, #3a3a3c, #2c2c2e);
          border-radius: 3px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .phone-screen {
          width: 100%;
          height: 100%;
          background: #000;
          overflow: hidden;
          position: relative;
        }
        .phone-island {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 34%;
          height: 32px;
          background: #000;
          border-radius: 20px;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 8px;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.06);
        }
        .phone-camera {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #1a3a5c, #0a0a14);
          box-shadow: 0 0 0 2px #0d0d1a, inset 0 0 0 3px rgba(255,255,255,0.05);
        }
        .phone-home-bar {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 36%;
          height: 5px;
          background: rgba(255,255,255,0.25);
          border-radius: 3px;
          z-index: 20;
        }
      `}</style>
    </div>
  );
};

export default StageView;
