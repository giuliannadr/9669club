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
    if (Array.isArray(meta.selectedIdentities)) return meta.selectedIdentities;
    if (typeof meta.selectedIdentity === 'string' && meta.selectedIdentity)
      return [meta.selectedIdentity];
    return [];
  } catch { return []; }
};

// ── Animated background blobs ────────────────────────────────────────────────
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

// ── Waiting screen (no QR — shown only in admin) ─────────────────────────────
const WaitingScreen: React.FC = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center select-none z-10">
    <div className="flex flex-col items-center gap-8 text-center">
      <p className="text-white/10 font-black tracking-[0.6em] text-2xl uppercase">
        9669<span className="text-orange-500/30">.STUDIO</span>
      </p>
      <div className="flex items-center gap-3 text-white/20 text-sm font-bold uppercase tracking-[0.4em]">
        <div className="w-2 h-2 bg-orange-500/40 rounded-full animate-pulse" />
        En espera de señal
        <div className="w-2 h-2 bg-orange-500/40 rounded-full animate-pulse" />
      </div>
    </div>
  </div>
);

// ── Single video slot (raw video, no mockup) ─────────────────────────────────
// Rotates portrait WebRTC stream so landscape filming fills the slot correctly.
const VideoSlot: React.FC<{
  participant: RemoteParticipant;
  count: number;
}> = ({ participant, count }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const attach = () => {
      const pub = participant.getTrackPublication(Track.Source.Camera);
      if (pub?.videoTrack && videoRef.current) pub.videoTrack.attach(videoRef.current);
    };
    attach();
    const onTrack = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && videoRef.current) track.attach(videoRef.current);
    };
    participant.on(ParticipantEvent.TrackSubscribed, onTrack);
    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, onTrack);
      const pub = participant.getTrackPublication(Track.Source.Camera);
      if (pub?.videoTrack && videoRef.current) pub.videoTrack.detach(videoRef.current);
    };
  }, [participant]);

  // Slot container style — fills its portion of the screen
  const slotStyle: React.CSSProperties =
    count === 4
      ? { width: '50vw', height: '50vh', position: 'relative', overflow: 'hidden', flexShrink: 0 }
      : { flex: 1, height: '100vh', position: 'relative', overflow: 'hidden' };

  // Video is rotated 90°: visual-width = css-height, visual-height = css-width.
  // We want the video to fill the slot after rotation, so we swap the dimensions:
  //   css-width  = slot height   (becomes visual height)
  //   css-height = slot width    (becomes visual width)
  let videoStyle: React.CSSProperties;
  if (count === 1) {
    videoStyle = { width: '100vh', height: '100vw' };
  } else if (count === 2) {
    videoStyle = { width: '100vh', height: '50vw' };
  } else if (count === 3) {
    videoStyle = { width: '100vh', height: 'calc(100vw / 3)' };
  } else {
    // 4 videos — 2×2 grid, each slot 50vw × 50vh
    videoStyle = { width: '50vh', height: '50vw' };
  }

  return (
    <div style={slotStyle}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(90deg)',
          objectFit: 'cover',
          ...videoStyle,
        }}
      />
    </div>
  );
};

// ── Main StageView ───────────────────────────────────────────────────────────
const StageView: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [participants, setParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const [selectedIdentities, setSelectedIdentities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    if (!roomId || !LIVEKIT_URL) { setError('Sala no encontrada.'); return; }

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
          if (p.identity !== 'admin' && p.identity !== 'stage')
            setParticipants(prev => new Map(prev).set(p.identity, p));
        });

        room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
          setParticipants(prev => { const n = new Map(prev); n.delete(p.identity); return n; });
          setSelectedIdentities(prev => prev.filter(id => id !== p.identity));
        });

        room.on(RoomEvent.TrackSubscribed, (_t, _p, participant: RemoteParticipant) => {
          if (participant.identity !== 'admin' && participant.identity !== 'stage')
            setParticipants(prev => new Map(prev).set(participant.identity, participant));
        });

        room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
          try {
            const msg = JSON.parse(new TextDecoder().decode(payload));
            if (msg.type === 'SELECT_STREAMS' && Array.isArray(msg.identities))
              setSelectedIdentities(msg.identities.slice(0, 4));
            if (msg.type === 'SELECT_STREAM' && typeof msg.participantIdentity === 'string')
              setSelectedIdentities(msg.participantIdentity ? [msg.participantIdentity] : []);
          } catch { /* ignore */ }
        });

        room.on(RoomEvent.ParticipantMetadataChanged, (_m, participant) => {
          if (participant.identity === 'admin') {
            const ids = readSelectedIdentities(participant as RemoteParticipant);
            if (ids.length > 0) setSelectedIdentities(ids.slice(0, 4));
          }
        });

        await room.connect(LIVEKIT_URL, token);

        setParticipants(new Map(
          Array.from(room.remoteParticipants.entries())
            .filter(([id]) => id !== 'admin' && id !== 'stage')
        ));

        const tryReadAdmin = () => {
          const ids = readSelectedIdentities(roomRef.current?.remoteParticipants.get('admin'));
          if (ids.length > 0) setSelectedIdentities(ids.slice(0, 4));
        };
        tryReadAdmin();
        setTimeout(tryReadAdmin, 800);
        setTimeout(tryReadAdmin, 2000);
      } catch (err) {
        setError('No se pudo conectar.');
        console.error(err);
      }
    };

    connect();
    return () => { roomRef.current?.disconnect(); };
  }, [roomId]);

  const selectedParticipants = selectedIdentities
    .map(id => participants.get(id))
    .filter((p): p is RemoteParticipant => !!p);

  const count = selectedParticipants.length;

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-neutral-500 text-xl font-bold uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* Animated bg — always visible (shows through when no streams) */}
      {count === 0 && <AnimatedBg />}

      {count === 0 && <WaitingScreen />}

      {/* Video grid — no mockups, fills the screen */}
      {count > 0 && (
        <div
          className={count === 4 ? 'fixed inset-0 flex flex-wrap' : 'fixed inset-0 flex'}
        >
          {selectedParticipants.map(p => (
            <VideoSlot key={p.identity} participant={p} count={count} />
          ))}
        </div>
      )}

      <style>{`
        .blob { position:absolute; border-radius:50%; filter:blur(100px); opacity:0.18; will-change:transform; }
        .blob-1 { width:700px; height:700px; background:radial-gradient(circle,#f97316,transparent 70%); top:-10%; left:-10%; animation:blob1 18s ease-in-out infinite alternate; }
        .blob-2 { width:600px; height:600px; background:radial-gradient(circle,#e11d48,transparent 70%); bottom:-15%; right:-10%; animation:blob2 22s ease-in-out infinite alternate; }
        .blob-3 { width:500px; height:500px; background:radial-gradient(circle,#ea580c,transparent 70%); top:40%; left:35%; animation:blob3 26s ease-in-out infinite alternate; opacity:0.10; }
        .blob-4 { width:400px; height:400px; background:radial-gradient(circle,#fb923c,transparent 70%); top:10%; right:20%; animation:blob4 20s ease-in-out infinite alternate; opacity:0.08; }
        @keyframes blob1 { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(80px,-60px) scale(1.08)} 66%{transform:translate(-50px,90px) scale(0.94)} 100%{transform:translate(60px,40px) scale(1.04)} }
        @keyframes blob2 { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(-90px,70px) scale(1.06)} 66%{transform:translate(60px,-80px) scale(0.96)} 100%{transform:translate(-40px,-30px) scale(1.02)} }
        @keyframes blob3 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(100px,-70px) scale(1.12)} 100%{transform:translate(-80px,50px) scale(0.9)} }
        @keyframes blob4 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-60px,100px) scale(1.08)} 100%{transform:translate(70px,-50px) scale(0.95)} }
      `}</style>
    </div>
  );
};

export default StageView;
