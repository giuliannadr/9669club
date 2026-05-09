import React, { useEffect, useState } from 'react';
// Assuming useSocket is a shared hook that provides a Socket.io client instance
import { useSocket } from '../../hooks/useSocket';

/**
 * LiveSwitcher Component
 * Control Room interface for admin to switch active streams in real-time.
 */
export const LiveSwitcher: React.FC = () => {
  const { socket } = useSocket();
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);

  useEffect(() => {
    // Listen for acknowledgment or external changes if needed
    socket?.on('stream_switched', (streamId: string) => {
      setActiveStreamId(streamId);
    });

    return () => {
      socket?.off('stream_switched');
    };
  }, [socket]);

  const handleSwitchStream = (streamId: string) => {
    setActiveStreamId(streamId);
    
    // REAL-TIME BRIDGE LOGIC:
    // 1. El admin-dashboard (Control Room) emite un evento con el 'stream_id' 
    //    a través de Socket.io hacia el servidor central.
    // 2. El servidor retransmite este evento a la projector-view.
    // 3. La projector-view escucha el evento 'stream_switched' (o similar)
    //    y actualiza el componente visual que consume el WebRTC stream
    //    con el nuevo streamId activo, permitiendo el cambio de cámaras en vivo.
    socket?.emit('switch_active_stream', { streamId });
    console.log(`Switched to stream: ${streamId}`);
  };

  return (
    <div className="flex flex-col p-6 bg-gray-900 text-white rounded-lg shadow-xl w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-indigo-400">Control Room: Live Switcher</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Mocking available streams for demonstration */}
        {['stream-guest-1', 'stream-guest-2', 'stream-main-cam'].map(streamId => (
          <button
            key={streamId}
            onClick={() => handleSwitchStream(streamId)}
            className={`p-4 border-2 rounded-lg font-semibold transition-all duration-300 ${
              activeStreamId === streamId 
                ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.5)] scale-105' 
                : 'bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-500'
            }`}
          >
            {streamId}
          </button>
        ))}
      </div>
    </div>
  );
};
