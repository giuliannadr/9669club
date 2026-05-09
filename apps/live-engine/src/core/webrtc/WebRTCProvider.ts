import { Room, RoomEvent } from 'livekit-client';

export class WebRTCProvider {
  private room: Room;

  constructor(private url: string, private token: string) {
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    this.setupListeners();
  }

  private setupListeners() {
    this.room.on(RoomEvent.Connected, () => {
      console.log('Connected to LiveKit room');
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from LiveKit room');
      this.handleReconnection();
    });
  }

  /**
   * Error Boundaries Strategy for Guest Streamer:
   * Implement automatic reconnection logic using exponential backoff
   * when the guest connection drops unexpectedly. This ensures the 
   * live-engine recovers gracefully without manual intervention.
   */
  private async handleReconnection() {
    let retries = 0;
    const maxRetries = 5;
    
    const tryConnect = async () => {
      try {
        await this.connect();
        console.log('Reconnected successfully');
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          const timeout = Math.pow(2, retries) * 1000;
          setTimeout(tryConnect, timeout);
        } else {
          console.error('Failed to reconnect after maximum retries. Please check network.');
        }
      }
    };

    tryConnect();
  }

  public async connect() {
    await this.room.connect(this.url, this.token);
  }

  public getRoom() {
    return this.room;
  }
}
