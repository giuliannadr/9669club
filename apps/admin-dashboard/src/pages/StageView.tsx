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

type FilterId = 'none' | 'retro';

// ── Read admin metadata ───────────────────────────────────────────────────────
const readAdminMeta = (participant: RemoteParticipant | undefined) => {
  if (!participant?.metadata) return null;
  try {
    const meta = JSON.parse(participant.metadata);
    const selectedIdentities: string[] = Array.isArray(meta.selectedIdentities)
      ? meta.selectedIdentities
      : typeof meta.selectedIdentity === 'string' && meta.selectedIdentity
        ? [meta.selectedIdentity]
        : [];
    const filter: FilterId = meta.filter === 'retro' ? 'retro' : 'none';
    const partyName: string = typeof meta.partyName === 'string' ? meta.partyName : '';
    return { selectedIdentities, filter, partyName };
  } catch { return null; }
};

// ── Animated background ───────────────────────────────────────────────────────
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

// ── Waiting screen ────────────────────────────────────────────────────────────
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

// ── Film grain canvas ─────────────────────────────────────────────────────────
const GrainCanvas: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width  = 320;
    canvas.height = 180;
    let raf: number;
    let tick = 0;
    const draw = () => {
      if (tick++ % 4 === 0) {
        const d = ctx.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < d.data.length; i += 4) {
          const v = (Math.random() * 255) | 0;
          d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
          d.data[i + 3] = 28;
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

// ── Retro camcorder HUD — per video slot ──────────────────────────────────────
// compact=true when shown inside a sub-slot (multiple cameras)
const RetroCamHUD: React.FC<{
  partyName: string;
  liveTime: number;
  compact?: boolean;
}> = ({ partyName, liveTime, compact = false }) => {
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

  // Sizes adapt for compact (multi-slot) vs full-screen
  const fs = {
    base:    compact ? 8  : 13,
    name:    compact ? 13 : 22,   // party name — noticeably larger
    timecode: compact ? 12 : 20,
    clock:   compact ? 13 : 22,
    tiny:    compact ? 7  : 10,
    icon:    compact ? 8  : 11,
  };

  // Bracket size + position — defined so text can clear them with percentage padding
  const bSize = compact ? 18 : 30;

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none z-20"
      style={{ fontFamily: 'monospace' }}
    >
      {/* Vignette */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.75) 100%)',
      }} />

      {/* Grain */}
      <GrainCanvas />

      {/* Corner brackets — anchored to corners, text content starts AFTER them */}
      {[
        { top: '5%',    left: '3%',   borderTop: '2px solid rgba(255,255,255,0.65)', borderLeft: '2px solid rgba(255,255,255,0.65)' },
        { top: '5%',    right: '3%',  borderTop: '2px solid rgba(255,255,255,0.65)', borderRight: '2px solid rgba(255,255,255,0.65)' },
        { bottom: '5%', left: '3%',   borderBottom: '2px solid rgba(255,255,255,0.65)', borderLeft: '2px solid rgba(255,255,255,0.65)' },
        { bottom: '5%', right: '3%',  borderBottom: '2px solid rgba(255,255,255,0.65)', borderRight: '2px solid rgba(255,255,255,0.65)' },
      ].map((s, i) => (
        <div key={i} className="absolute" style={{ width: bSize, height: bSize, ...s }} />
      ))}

      {/* Center crosshair */}
      <div className="absolute inset-0 flex items-center justify-center opacity-15">
        <div style={{ width: bSize + 10, height: bSize + 10, position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'white' }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'white' }} />
        </div>
      </div>

      {/*
        TOP BAR
        Horizontal padding (px) = 5% + bracketSize + gap → use ~11% so text is
        always clear of the corner bracket on both sides.
        Vertical padding (pt)   = 6% + bracketHeight  → use ~13% to clear top brackets.
      */}
      <div
        className="absolute top-0 left-0 right-0 flex justify-between items-start"
        style={{
          padding: `13% 11% 0`,
          fontSize: fs.base,
          color: 'rgba(255,255,255,0.82)',
          lineHeight: 1.45,
        }}
      >
        {/* Top-left */}
        <div>
          <div className="flex gap-2">
            <span>RKT MODE</span>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>▌▌▌▌▌</span>
            <span>SEÑAL 100%</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)' }}>AUTO</div>
          <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <span style={{
              fontSize: fs.icon,
              border: '1px solid rgba(255,255,255,0.35)',
              padding: '0 2px',
            }}>▶</span>
            <span>{name} CAME</span>
          </div>
        </div>

        {/* Top-center: timecode */}
        <div className="flex flex-col items-center">
          <div style={{
            border: '1px solid rgba(255,255,255,0.4)',
            padding: compact ? '2px 6px' : '3px 10px',
            letterSpacing: '0.12em',
            fontSize: fs.timecode,
            fontWeight: 700,
          }}>
            {timecode}
          </div>
          <div className="flex items-center gap-1 mt-0.5" style={{ fontSize: fs.tiny, color: 'rgba(255,50,50,0.9)' }}>
            <span style={{
              width: compact ? 5 : 7,
              height: compact ? 5 : 7,
              borderRadius: '50%',
              background: 'rgba(255,50,50,0.9)',
              display: 'inline-block',
              animation: 'stagePulse 1s infinite',
            }} />
            REC
          </div>
        </div>

        {/* Top-right: party name — bigger, clear of bracket */}
        <div className="text-right">
          <div style={{
            fontWeight: 900,
            letterSpacing: '0.07em',
            fontSize: fs.name,
            lineHeight: 1.1,
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          }}>
            {name}<br />
            <span style={{ fontSize: fs.base * 0.85, fontWeight: 700, letterSpacing: '0.2em', opacity: 0.85 }}>CAM</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: fs.tiny, marginTop: 2 }}>
            -0.8 <span style={{ letterSpacing: '-1px' }}>▌▌▌▌▌</span>
          </div>
        </div>
      </div>

      {/*
        BOTTOM BAR
        Mirror of top: 13% bottom padding to clear bottom brackets.
      */}
      <div
        className="absolute bottom-0 left-0 right-0 flex justify-between items-end"
        style={{
          padding: `0 11% 13%`,
          fontSize: fs.base,
          color: 'rgba(255,255,255,0.72)',
          lineHeight: 1.5,
        }}
      >
        {/* Bottom-left */}
        <div>
          <div style={{ color: 'rgba(255,255,255,0.4)' }}>RKT</div>
          <div style={{
            border: '1px solid rgba(255,255,255,0.4)',
            padding: '0 3px',
            display: 'inline-block',
            color: 'rgba(255,255,255,0.55)',
          }}>TOUR</div>
          <div style={{ color: 'rgba(255,255,255,0.4)' }}>PISTA ON</div>
          <div style={{ color: 'rgba(255,255,255,0.4)' }}>AWB</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: fs.tiny }}>
            RKT LVL <span style={{ letterSpacing: '-1px' }}>▌▌▌▌▌▌▌▌▌▌</span>
          </div>
        </div>

        {/* Bottom-center: real clock */}
        <div className="text-center">
          <div style={{ fontSize: fs.tiny, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.4)' }}>AFTER TIME</div>
          <div style={{ fontSize: fs.clock, fontWeight: 700, letterSpacing: '0.1em' }}>{clockStr}</div>
        </div>

        {/* Bottom-right */}
        <div className="text-right" style={{ color: 'rgba(255,255,255,0.45)' }}>
          <div>BPM 150</div>
          <div>1/200</div>
        </div>
      </div>

      {/* Scan lines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
        zIndex: 9,
      }} />
    </div>
  );
};

// ── Single video slot — includes its own filter + HUD overlay ─────────────────
const VideoSlot: React.FC<{
  participant: RemoteParticipant;
  count: number;
  activeFilter: FilterId;
  partyName: string;
  liveTime: number;
}> = ({ participant, count, activeFilter, partyName, liveTime }) => {
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

  const slotStyle: React.CSSProperties =
    count === 4
      ? { width: '50vw', height: '50vh', position: 'relative', overflow: 'hidden', flexShrink: 0 }
      : { flex: 1, height: '100vh', position: 'relative', overflow: 'hidden' };

  // Portrait stream → rotated to fill slot. Swap css w/h so post-rotation it fills.
  let videoStyle: React.CSSProperties;
  if (count === 1)      videoStyle = { width: '100vh', height: '100vw' };
  else if (count === 2) videoStyle = { width: '100vh', height: '50vw' };
  else if (count === 3) videoStyle = { width: '100vh', height: 'calc(100vw / 3)' };
  else                  videoStyle = { width: '50vh',  height: '50vw' };

  const videoFilter = activeFilter === 'retro'
    ? 'grayscale(1) contrast(1.08) brightness(0.88)'
    : 'none';

  // compact HUD for 3–4 slot layouts
  const compact = count >= 3;

  return (
    <div style={slotStyle}>
      {/* Video — filter applied per slot */}
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
          filter: videoFilter,
          ...videoStyle,
        }}
      />

      {/* Retro HUD — contained within each slot */}
      {activeFilter === 'retro' && (
        <RetroCamHUD partyName={partyName} liveTime={liveTime} compact={compact} />
      )}
    </div>
  );
};

// ── Main StageView ────────────────────────────────────────────────────────────
const StageView: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [participants, setParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const [selectedIdentities, setSelectedIdentities] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterId>('none');
  const [partyName, setPartyName] = useState('');
  const [liveTime, setLiveTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);

  const selectedParticipants = selectedIdentities
    .map(id => participants.get(id))
    .filter((p): p is RemoteParticipant => !!p);

  const count = selectedParticipants.length;
  const hasStreams = count > 0;

  // Count up while streams are active; reset when streams stop
  useEffect(() => {
    if (!hasStreams) { setLiveTime(0); return; }
    const interval = setInterval(() => setLiveTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [hasStreams]);

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
            if (msg.type === 'SET_FILTER') {
              setActiveFilter(msg.filter === 'retro' ? 'retro' : 'none');
              setPartyName(typeof msg.partyName === 'string' ? msg.partyName : '');
            }
          } catch { /* ignore */ }
        });

        room.on(RoomEvent.ParticipantMetadataChanged, (_m, participant) => {
          if (participant.identity === 'admin') {
            const meta = readAdminMeta(participant as RemoteParticipant);
            if (!meta) return;
            if (meta.selectedIdentities.length > 0) setSelectedIdentities(meta.selectedIdentities.slice(0, 4));
            setActiveFilter(meta.filter);
            setPartyName(meta.partyName);
          }
        });

        await room.connect(LIVEKIT_URL, token);

        setParticipants(new Map(
          Array.from(room.remoteParticipants.entries())
            .filter(([id]) => id !== 'admin' && id !== 'stage')
        ));

        const tryReadAdmin = () => {
          const admin = roomRef.current?.remoteParticipants.get('admin');
          const meta = readAdminMeta(admin);
          if (!meta) return;
          if (meta.selectedIdentities.length > 0) setSelectedIdentities(meta.selectedIdentities.slice(0, 4));
          setActiveFilter(meta.filter);
          setPartyName(meta.partyName);
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

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-neutral-500 text-xl font-bold uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {count === 0 && <AnimatedBg />}
      {count === 0 && <WaitingScreen />}

      {/* Video grid — each slot handles its own filter + HUD */}
      {count > 0 && (
        <div className={count === 4 ? 'fixed inset-0 flex flex-wrap' : 'fixed inset-0 flex'}>
          {selectedParticipants.map(p => (
            <VideoSlot
              key={p.identity}
              participant={p}
              count={count}
              activeFilter={activeFilter}
              partyName={partyName}
              liveTime={liveTime}
            />
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
        @keyframes stagePulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
      `}</style>
    </div>
  );
};

export default StageView;
