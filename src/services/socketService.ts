import { io, Socket } from 'socket.io-client';

interface Player {
  id: string;
  name: string;
  score: number;
  isDrawing: boolean;
  socketId: string;
}

interface JoinSuccessData {
  roomId: string;
  playerId: string;
  players: Player[];
  gameState?: 'waiting' | 'playing';
  timeLeft?: number;
  currentWord?: string;
}

interface PlayerJoinedData {
  player: Player;
  players: Player[];
  gameState?: 'waiting' | 'playing';
  timeLeft?: number;
}

interface PlayerLeftData {
  playerId: string;
  playerName: string;
  players: Player[];
  gameState?: 'waiting' | 'playing';
  timeLeft?: number;
}

interface MessageData {
  id: string;
  player: string;
  message: string;
  type: 'chat' | 'guess';
}

interface CorrectGuessData {
  guessingPlayer: string;
  drawingPlayer?: string;
  word: string;
  players: Player[];
}

interface NewRoundData {
  currentWord: string;
  players: Player[];
  roundNumber: number;
  timeLeft: number;
}

interface DrawingData {
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
}

class SocketService {
  private socket: Socket | null = null;
  private readonly serverUrl = this.getServerUrl();

  private getServerUrl(): string {
    // In development, check if we're running on mobile/different device
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    } else {
      // Use the same IP as the frontend but port 3001 for backend
      return `http://${hostname}:3001`;
    }
  }

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(this.serverUrl, {
        transports: ['websocket']
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Room operations
  async checkRoomExists(roomId: string): Promise<{ exists: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.serverUrl}/api/rooms/${roomId}`);
      if (response.ok) {
        return { exists: true };
      } else if (response.status === 404) {
        return { exists: false, error: 'Room not found' };
      } else {
        return { exists: false, error: 'Error checking room' };
      }
    } catch (error) {
      return { exists: false, error: 'Unable to connect to server' };
    }
  }

  async createRoom(playerName: string): Promise<{ success: boolean; roomId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.serverUrl}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerName }),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, roomId: data.roomId };
      } else {
        const error = await response.json();
        return { success: false, error: error.error || 'Failed to create room' };
      }
    } catch (error) {
      return { success: false, error: 'Unable to connect to server' };
    }
  }

  // Socket event handlers
  joinRoom(roomId: string, playerName: string, callbacks: {
    onSuccess: (data: JoinSuccessData) => void;
    onError: (error: string) => void;
  }) {
    const socket = this.connect();
    
    socket.emit('join-room', { roomId, playerName });
    
    socket.on('join-success', callbacks.onSuccess);
    socket.on('join-error', (data: { message: string }) => callbacks.onError(data.message));
  }

  leaveRoom(roomId: string) {
    if (this.socket) {
      this.socket.emit('leave-room', { roomId });
    }
  }

  // Drawing events
  sendDrawing(roomId: string, drawingData: DrawingData) {
    if (this.socket) {
      this.socket.emit('drawing', { roomId, ...drawingData });
    }
  }

  onDrawing(callback: (data: DrawingData & { roomId: string }) => void) {
    if (this.socket) {
      this.socket.on('drawing', callback);
    }
  }

  // Chat/Message events
  sendMessage(roomId: string, message: string, type: 'chat' | 'guess' = 'chat') {
    if (this.socket) {
      this.socket.emit('send-message', { roomId, message, type });
    }
  }

  onNewMessage(callback: (message: MessageData) => void) {
    if (this.socket) {
      this.socket.on('new-message', callback);
    }
  }

  // Player events
  onPlayerJoined(callback: (data: PlayerJoinedData) => void) {
    if (this.socket) {
      this.socket.on('player-joined', callback);
    }
  }

  onPlayerLeft(callback: (data: PlayerLeftData) => void) {
    if (this.socket) {
      this.socket.on('player-left', callback);
    }
  }

  onCorrectGuess(callback: (data: CorrectGuessData) => void) {
    if (this.socket) {
      this.socket.on('correct-guess', callback);
    }
  }

  onNewRound(callback: (data: NewRoundData) => void) {
    if (this.socket) {
      this.socket.on('new-round', callback);
    }
  }

  // Cleanup
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
export type { Player, MessageData, DrawingData, CorrectGuessData, NewRoundData }; 