import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Mic, Video, VideoOff, MicOff, AlertCircle, Circle } from 'lucide-react';

const GuestLive: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showPermissionModal, setShowPermissionModal] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const guestId = useRef(`guest_${Math.random().toString(36).substring(2, 9)}`);

  // Formatear tiempo en MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Request Permissions
  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prefer back camera
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermissions(true);
      setShowPermissionModal(false);
    } catch (err) {
      console.error('Error accessing media devices.', err);
      setHasPermissions(false);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      console.log('Iniciando transmisión WebRTC al servidor para la sala:', roomId);
      localStorage.setItem('AV_STREAM_JOIN', JSON.stringify({
        roomId,
        guestId: guestId.current,
        timestamp: Date.now()
      }));
      setIsRecording(true);
    } else {
      console.log('Cortando transmisión WebRTC');
      localStorage.setItem('AV_STREAM_LEAVE', JSON.stringify({
        roomId,
        guestId: guestId.current,
        timestamp: Date.now()
      }));
      setIsRecording(false);
    }
  };

  // Cleanup & BeforeUnload
  useEffect(() => {
    const handleUnload = () => {
      if (isRecording) {
        localStorage.setItem('AV_STREAM_LEAVE', JSON.stringify({
          roomId,
          guestId: guestId.current,
          timestamp: Date.now()
        }));
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording, roomId]);

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col font-sans overflow-hidden">
      {/* Viewport for Camera */}
      <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
        {hasPermissions ? (
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center opacity-50">
            <Camera className="w-16 h-16 mb-4" />
            <p className="font-bold tracking-widest uppercase text-sm">Cámara Inactiva</p>
          </div>
        )}
        
        {/* Pro Camera Framing Corners */}
        {hasPermissions && (
          <div className="absolute inset-6 pointer-events-none opacity-40 mix-blend-overlay">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/80" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/80" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/80" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/80" />
            {/* Center Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center opacity-30">
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
            <h1 className="text-xl font-black tracking-tight drop-shadow-md">LIVE<span className="text-orange-500">CONTROL</span></h1>
            <p className="text-xs font-bold text-neutral-300 drop-shadow uppercase tracking-widest opacity-80 mt-1">
              SALA: {roomId?.split('_')[1] || roomId}
            </p>
          </div>

          {/* Status Indicator */}
          {isRecording && (
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-xl">
              <div className="flex items-center gap-1.5 text-rose-500 font-black text-[10px] tracking-widest uppercase">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(243,24,63,0.8)]" />
                EN VIVO
              </div>
              <div className="w-px h-3 bg-white/20" />
              <div className="text-white font-mono text-xs font-bold tracking-wider">
                {formatTime(recordingTime)}
              </div>
              <div className="w-px h-3 bg-white/20" />
              {/* Signal Bars */}
              <div className="flex items-end gap-[2px] h-3">
                <div className="w-1 h-1.5 bg-green-500 rounded-sm" />
                <div className="w-1 h-2 bg-green-500 rounded-sm" />
                <div className="w-1 h-2.5 bg-green-500 rounded-sm" />
                <div className="w-1 h-3 bg-green-500 rounded-sm animate-pulse" />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Footer Controls */}
        <div className="flex flex-col items-center justify-end p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-24 pointer-events-auto">
          
          <button 
            onClick={toggleRecording}
            disabled={!hasPermissions}
            className={`
              relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300
              ${!hasPermissions ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer hover:scale-105 active:scale-95'}
              ${isRecording ? 'bg-transparent border-[3px] border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)]' : 'bg-white border-[6px] border-white/20 bg-clip-padding'}
            `}
            style={isRecording ? { animation: 'glow-pulse 2s infinite alternate' } : {}}
          >
            {isRecording ? (
              <div className="w-8 h-8 bg-orange-500 rounded-sm transition-all duration-300 shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
            ) : (
              <div className="absolute inset-0 m-auto w-[68px] h-[68px] bg-rose-600 rounded-full flex items-center justify-center shadow-inner">
                <span className="text-white font-black text-xs tracking-widest uppercase">REC</span>
              </div>
            )}
            
            {/* Outer pulse effect when recording */}
            {isRecording && (
              <div className="absolute inset-0 rounded-full border border-orange-500/50 animate-ping opacity-30" />
            )}
          </button>

          {!isRecording && hasPermissions && (
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-6 drop-shadow">
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

      {/* Permissions Modal */}
      {showPermissionModal && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Video className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Convertite en el<br/>Camarógrafo</h2>
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
                <AlertCircle className="w-4 h-4" /> Permisos denegados. Revisá los ajustes de tu navegador.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestLive;
