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

// ── VHS glitch canvas ─────────────────────────────────────────────────────────
// Randomly fires analog-failure artifacts: displaced bands, bright tape creases,
// static bursts — zero impact on WebRTC stream quality.
type GlitchEvent = {
  bands:     { y: number; h: number; alpha: number; bright: boolean; xOff: number }[];
  scanLine:  { y: number; h: number; alpha: number } | null;
  noiseBand: { y: number; h: number } | null;
};

const GlitchCanvas: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = 320;
    canvas.height = 180;

    let raf: number;
    let glitchUntil = 0;
    let nextGlitch   = Date.now() + 1500 + Math.random() * 5000;
    let current: GlitchEvent | null = null;

    const mkGlitch = (): GlitchEvent => ({
      bands: Array.from({ length: 1 + Math.floor(Math.random() * 4) }, () => ({
        y:      Math.random(),
        h:      0.012 + Math.random() * 0.055,
        alpha:  0.25  + Math.random() * 0.50,
        bright: Math.random() > 0.40,
        xOff:   (Math.random() - 0.5) * 0.15, // horizontal drift fraction
      })),
      scanLine: Math.random() > 0.30 ? {
        y:     Math.random(),
        h:     0.003 + Math.random() * 0.008,
        alpha: 0.55  + Math.random() * 0.40,
      } : null,
      noiseBand: Math.random() > 0.50 ? {
        y: Math.random() * 0.8,
        h: 0.03 + Math.random() * 0.08,
      } : null,
    });

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();

      if (now > nextGlitch) {
        const dur = 55 + Math.random() * 340;
        glitchUntil = now + dur;
        // 30% chance of a quick double-hit shortly after
        nextGlitch = now + dur + (Math.random() > 0.70
          ? 60 + Math.random() * 180
          : 1800 + Math.random() * 7000);
        current = mkGlitch();
      }

      if (now < glitchUntil && current) {
        const W = canvas.width, H = canvas.height;

        // Horizontal displaced bands (bright or dark)
        current.bands.forEach(b => {
          ctx.fillStyle = b.bright
            ? `rgba(255,255,255,${b.alpha})`
            : `rgba(0,0,0,${b.alpha})`;
          ctx.fillRect(b.xOff * W, b.y * H, W, b.h * H);
        });

        // Thin bright scan line (tape crease)
        if (current.scanLine) {
          const sl = current.scanLine;
          ctx.fillStyle = `rgba(255,255,255,${sl.alpha})`;
          ctx.fillRect(0, sl.y * H, W, sl.h * H);
        }

        // Static noise band
        if (current.noiseBand) {
          const nb    = current.noiseBand;
          const yPx   = Math.floor(nb.y * H);
          const hPx   = Math.max(1, Math.ceil(nb.h * H));
          const strip = ctx.createImageData(W, hPx);
          for (let i = 0; i < strip.data.length; i += 4) {
            const v = (Math.random() * 255) | 0;
            strip.data[i] = strip.data[i + 1] = strip.data[i + 2] = v;
            strip.data[i + 3] = Math.random() > 0.45 ? 190 : 55;
          }
          ctx.putImageData(strip, 0, yPx);
        }
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
      style={{ zIndex: 12, mixBlendMode: 'overlay', opacity: 0.88 }}
    />
  );
};

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
// Each info block is absolutely positioned near its corner, clearing the bracket.
// compact=true for 3–4 slot layouts (smaller fonts, tighter brackets).
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

  const fs = {
    base:     compact ? 8  : 12,
    name:     compact ? 12 : 20,
    timecode: compact ? 11 : 18,
    clock:    compact ? 12 : 20,
    tiny:     compact ? 6  : 9,
    icon:     compact ? 7  : 10,
  };

  // Bracket: size + anchor distance from each edge
  const bSize  = compact ? 16 : 26;  // bracket arm length (px)
  const bEdgeV = '4%';               // distance from top/bottom edge
  const bEdgeH = '2.5%';            // distance from left/right edge

  // Text offset from edge = bracket arm + small gap
  // Using calc() so it works at any resolution
  const gap   = compact ? 6 : 8;
  const tOff  = `calc(${bEdgeV} + ${bSize + gap}px)`;   // top/bottom text offset
  const hOff  = bEdgeH;                                   // left/right — align with bracket

  const color     = 'rgba(255,255,255,0.82)';
  const colorDim  = 'rgba(255,255,255,0.45)';
  const colorFaint= 'rgba(255,255,255,0.30)';

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none z-20"
      style={{ fontFamily: 'monospace' }}
    >
      {/* Vignette */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.72) 100%)',
      }} />

      {/* Grain (constant subtle texture) */}
      <GrainCanvas />

      {/* VHS glitch artifacts (random, occasional) */}
      <GlitchCanvas />

      {/* ── Corner brackets ── */}
      {[
        { top: bEdgeV,    left: bEdgeH,  borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
        { top: bEdgeV,    right: bEdgeH, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` },
        { bottom: bEdgeV, left: bEdgeH,  borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
        { bottom: bEdgeV, right: bEdgeH, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` },
      ].map((s, i) => (
        <div key={i} className="absolute" style={{ width: bSize, height: bSize, ...s }} />
      ))}

      {/* ── Center crosshair ── */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.12 }}>
        <div style={{ width: compact ? 28 : 38, height: compact ? 28 : 38, position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'white' }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'white' }} />
        </div>
      </div>

      {/* ══ TOP-LEFT — mode / signal / cam label ══ */}
      <div className="absolute" style={{
        top: tOff, left: hOff,
        fontSize: fs.base, color: colorDim, lineHeight: 1.5,
      }}>
        <div style={{ color, display: 'flex', gap: compact ? 6 : 10, alignItems: 'center' }}>
          <span>RKT MODE</span>
          <span style={{ color: colorFaint, letterSpacing: '-1px' }}>▌▌▌▌▌</span>
          <span>SEÑAL 100%</span>
        </div>
        <div>AUTO</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: fs.icon,
            border: `1px solid ${colorDim}`,
            padding: '0 2px',
            lineHeight: 1.4,
          }}>▶</span>
          <span>{name} CAME</span>
        </div>
      </div>

      {/* ══ TOP-CENTER — timecode + REC ══ */}
      <div style={{
        position: 'absolute',
        top: tOff,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: compact ? 2 : 3,
      }}>
        <div style={{
          border: `1px solid rgba(255,255,255,0.5)`,
          padding: compact ? '2px 6px' : '3px 12px',
          letterSpacing: '0.14em',
          fontSize: fs.timecode,
          fontWeight: 700,
          color,
        }}>
          {timecode}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: fs.tiny, color: 'rgba(255,50,50,0.9)',
        }}>
          <span style={{
            width: compact ? 4 : 6, height: compact ? 4 : 6,
            borderRadius: '50%', background: 'rgba(255,50,50,0.9)',
            display: 'inline-block', animation: 'stagePulse 1s infinite',
          }} />
          REC
        </div>
      </div>

      {/* ══ TOP-RIGHT — party name (big) ══ */}
      <div style={{
        position: 'absolute',
        top: tOff,
        right: hOff,
        textAlign: 'right',
        lineHeight: 1.15,
      }}>
        <div style={{
          fontSize: fs.name,
          fontWeight: 900,
          color,
          letterSpacing: '0.06em',
          textShadow: '0 1px 6px rgba(0,0,0,0.7)',
        }}>
          {name}
        </div>
        <div style={{
          fontSize: fs.base,
          fontWeight: 700,
          letterSpacing: '0.25em',
          color: colorDim,
          marginTop: compact ? 1 : 2,
        }}>
          CAM
        </div>
        <div style={{ fontSize: fs.tiny, color: colorFaint, marginTop: compact ? 1 : 3 }}>
          -0.8 <span style={{ letterSpacing: '-1px' }}>▌▌▌▌</span>
        </div>
      </div>

      {/* ══ BOTTOM-LEFT — RKT / TOUR / PISTA / AWB / level ══ */}
      <div style={{
        position: 'absolute',
        bottom: tOff,
        left: hOff,
        fontSize: fs.base, color: colorDim, lineHeight: 1.5,
      }}>
        <div style={{ color: colorFaint }}>RKT</div>
        <div style={{
          border: `1px solid ${colorDim}`,
          padding: '0 3px',
          display: 'inline-block',
          color: colorDim,
          lineHeight: 1.4,
        }}>TOUR</div>
        <div>PISTA ON</div>
        <div>AWB</div>
        <div style={{ fontSize: fs.tiny, color: colorFaint }}>
          RKT LVL <span style={{ letterSpacing: '-1px' }}>▌▌▌▌▌▌▌▌▌</span>
        </div>
      </div>

      {/* ══ BOTTOM-CENTER — real clock ══ */}
      <div style={{
        position: 'absolute',
        bottom: tOff,
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: fs.tiny, letterSpacing: '0.35em', color: colorFaint }}>
          AFTER TIME
        </div>
        <div style={{ fontSize: fs.clock, fontWeight: 700, letterSpacing: '0.1em', color }}>
          {clockStr}
        </div>
      </div>

      {/* ══ BOTTOM-RIGHT — exposure / BPM ══ */}
      <div style={{
        position: 'absolute',
        bottom: tOff,
        right: hOff,
        textAlign: 'right',
        fontSize: fs.base, color: colorDim, lineHeight: 1.5,
      }}>
        <div style={{ color: colorFaint }}>1/200</div>
        <div style={{ color: colorFaint }}>F 2.8</div>
        <div>BPM 150</div>
        <div style={{ fontSize: fs.tiny, color: colorFaint }}>
          <span style={{ letterSpacing: '-1px' }}>▌▌▌▌▌▌▌</span> 0dB
        </div>
      </div>

      {/* Scan lines */}
      <div className="absolute inset-0" style={{
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
