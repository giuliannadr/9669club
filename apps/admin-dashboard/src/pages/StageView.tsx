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

// ── Retro camcorder HUD ───────────────────────────────────────────────────────
const RetroCamHUD: React.FC<{
  partyName: string;
  liveTime: number;
}> = ({ partyName, liveTime }) => {
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

      {/* Corner brackets */}
      {[
        { top: '6%', left: '3%',   borderTop: '3px solid rgba(255,255,255,0.65)', borderLeft: '3px solid rgba(255,255,255,0.65)' },
        { top: '6%', right: '3%',  borderTop: '3px solid rgba(255,255,255,0.65)', borderRight: '3px solid rgba(255,255,255,0.65)' },
        { bottom: '6%', left: '3%',  borderBottom: '3px solid rgba(255,255,255,0.65)', borderLeft: '3px solid rgba(255,255,255,0.65)' },
        { bottom: '6%', right: '3%', borderBottom: '3px solid rgba(255,255,255,0.65)', borderRight: '3px solid rgba(255,255,255,0.65)' },
      ].map((s, i) => (
        <div key={i} className="absolute" style={{ width: 36, height: 36, ...s }} />
      ))}

      {/* Center crosshair */}
      <div className="absolute inset-0 flex items-center justify-center opacity-15">
        <div style={{ width: 40, height: 40, position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'white' }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'white' }} />
        </div>
      </div>

      {/* TOP BAR */}
      <div
        className="absolute top-0 left-0 right-0 px-6 pt-4 flex justify-between items-start"
        style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.4 }}
      >
        {/* Top-left */}
        <div>
          <div className="flex gap-3">
            <span>RKT MODE</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>▌▌▌▌▌</span>
            <span>SEÑAL 100%</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)' }}>AUTO</div>
          <div className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span style={{ fontSize: 11, border: '1px solid rgba(255,255,255,0.35)', padding: '0 3px' }}>▶</span>
            <span>{name} CAME</span>
          </div>
        </div>

        {/* Top-center: timecode */}
        <div className="flex flex-col items-center">
          <div style={{
            border: '1px solid rgba(255,255,255,0.4)',
            padding: '3px 10px',
            letterSpacing: '0.12em',
            fontSize: 20,
            fontWeight: 700,
          }}>
            {timecode}
          </div>
          <div className="flex items-center gap-1.5 mt-1" style={{ fontSize: 11, color: 'rgba(255,50,50,0.9)' }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'rgba(255,50,50,0.9)',
              display: 'inline-block',
              animation: 'stagePulse 1s infinite',
            }} />
            REC
          </div>
        </div>

        {/* Top-right */}
        <div className="text-right">
          <div style={{ fontWeight: 700, letterSpacing: '0.06em', fontSize: 15 }}>{name} CAM</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
            -0.8 <span style={{ letterSpacing: '-1px' }}>▌▌▌▌▌</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>-0.8</div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div
        className="absolute bottom-0 left-0 right-0 px-6 pb-4 flex justify-between items-end"
        style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.45 }}
      >
        {/* Bottom-left */}
        <div>
          <div style={{ color: 'rgba(255,255,255,0.45)' }}>RKT</div>
          <div style={{
            border: '1px solid rgba(255,255,255,0.4)',
            padding: '0 4px',
            display: 'inline-block',
            color: 'rgba(255,255,255,0.55)',
          }}>TOUR</div>
          <div style={{ color: 'rgba(255,255,255,0.45)' }}>PISTA ON</div>
          <div style={{ color: 'rgba(255,255,255,0.45)' }}>AWB</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>
            RKT LVL <span style={{ letterSpacing: '-1px' }}>▌▌▌▌▌▌▌▌▌▌</span>
          </div>
        </div>

        {/* Bottom-center: real clock */}
        <div className="text-center">
          <div style={{ fontSize: 11, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.4)' }}>AFTER TIME</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.1em' }}>{clockStr}</div>
        </div>

        {/* Bottom-right */}
        <div className="text-right" style={{ color: 'rgba(255,255,255,0.5)' }}>
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

// ── Single video slot ─────────────────────────────────────────────────────────
const VideoSlot: React.FC<{
  participant: RemoteParticipant;
  count: number;
  videoFilter: string;
}> = ({ participant, count, videoFilter }) => {
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

  let videoStyle: React.CSSProperties;
  if (count === 1)      videoStyle = { width: '100vh', height: '100vw' };
  else if (count === 2) videoStyle = { width: '100vh', height: '50vw' };
  else if (count === 3) videoStyle = { width: '100vh', height: 'calc(100vw / 3)' };
  else                  videoStyle = { width: '50vh',  height: '50vw' };

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
          filter: videoFilter,
          ...videoStyle,
        }}
      />
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

  // Count up liveTime while streams are active
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

        // Read admin state on connect (with retries for timing)
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

  const videoFilter = activeFilter === 'retro'
    ? 'grayscale(1) contrast(1.08) brightness(0.88)'
    : 'none';

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-neutral-500 text-xl font-bold uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* Animated bg — waiting state */}
      {count === 0 && <AnimatedBg />}
      {count === 0 && <WaitingScreen />}

      {/* Video grid */}
      {count > 0 && (
        <div className={count === 4 ? 'fixed inset-0 flex flex-wrap' : 'fixed inset-0 flex'}>
          {selectedParticipants.map(p => (
            <VideoSlot key={p.identity} participant={p} count={count} videoFilter={videoFilter} />
          ))}
        </div>
      )}

      {/* Retro HUD — rendered over entire screen */}
      {count > 0 && activeFilter === 'retro' && (
        <RetroCamHUD partyName={partyName} liveTime={liveTime} />
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
