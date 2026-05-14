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

const TOKEN_API_URL = import.meta.env.VITE_TOKEN_API_URL ?? '';
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL ?? '';

interface SelectMessage {
  type: 'SELECT_STREAM';
  participantIdentity: string;
}

const StageVideo: React.FC<{ participant: RemoteParticipant | null }> = ({ participant }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!participant) return;

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
      className="w-full h-full object-cover"
    />
  );
};

const StageView: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [participants, setParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    if (!roomId || !LIVEKIT_URL) {
      setError('Sala no encontrada o LiveKit no configurado.');
      return;
    }

    const connect = async () => {
      try {
        const res = await fetch(`${TOKEN_API_URL}/api/livekit-token`, {
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
          setParticipants(prev => new Map(prev).set(p.identity, p));
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
          setParticipants(prev => new Map(prev).set(participant.identity, participant));
        });

        room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
          try {
            const msg: SelectMessage = JSON.parse(new TextDecoder().decode(payload));
            if (msg.type === 'SELECT_STREAM') {
              setSelectedIdentity(msg.participantIdentity);
            }
          } catch {
            // ignore malformed messages
          }
        });

        await room.connect(LIVEKIT_URL, token);

        // Capture already-connected participants
        setParticipants(new Map(
          Array.from(room.remoteParticipants.entries()).filter(([id]) => id !== 'admin')
        ));
      } catch (err) {
        setError('No se pudo conectar a la sala.');
        console.error(err);
      }
    };

    connect();

    return () => {
      roomRef.current?.disconnect();
    };
  }, [roomId]);

  const selectedParticipant = selectedIdentity ? participants.get(selectedIdentity) ?? null : null;

  // Waiting / error screen
  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-500 text-xl font-bold uppercase tracking-widest">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Main video output */}
      <div className="absolute inset-0">
        {selectedParticipant ? (
          <StageVideo participant={selectedParticipant} />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-8">
            <div className="flex flex-col items-center gap-4">
              {isConnected ? (
                <>
                  <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                  <p className="text-neutral-600 text-2xl font-black uppercase tracking-[0.4em]">
                    Esperando selección...
                  </p>
                  <p className="text-neutral-700 text-sm tracking-widest">
                    El admin seleccionará la cámara a proyectar
                  </p>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-neutral-700 rounded-full" />
                  <p className="text-neutral-700 text-2xl font-black uppercase tracking-[0.4em]">
                    Conectando...
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subtle branding overlay */}
      {selectedParticipant && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-8 right-10 opacity-30 pointer-events-none">
            <p className="text-white font-black tracking-[0.3em] text-2xl drop-shadow-lg">
              9669<span className="text-orange-500">.STUDIO</span>
            </p>
          </div>
          <div className="absolute top-6 left-6 pointer-events-none">
            <div className="bg-rose-600 text-white px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-[0_0_15px_rgba(225,29,72,0.6)]">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              ON AIR
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StageView;
