import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins in development
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage for rooms
const rooms = new Map();

// Helper function to generate room codes
function generateRoomCode() {
  return 'ROOM' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Timer management functions
function startRoomTimer(room) {
  if (room.timer) {
    clearInterval(room.timer);
  }
  
  room.timer = setInterval(() => {
    if (room.timeLeft > 0) {
      room.timeLeft--;
      // Broadcast timer update to all players in room
      io.to(room.id).emit('timer-update', { timeLeft: room.timeLeft });
    } else {
      // Timer ended - no one guessed correctly
      clearInterval(room.timer);
      room.timer = null;
      
      console.log(`Time's up in room ${room.id} - moving to next round`);
      
      // Move to next round
      setTimeout(() => {
        nextRound(room);
      }, 1000);
    }
  }, 1000);
}

function stopRoomTimer(room) {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }
}

function resetRoomTimer(room) {
  stopRoomTimer(room);
  room.timeLeft = 60;
  io.to(room.id).emit('timer-update', { timeLeft: room.timeLeft });
}

// Game logic functions
function assignDrawingRoles(room) {
  const playersList = Array.from(room.players.values());
  
  // Reset all players to not drawing
  playersList.forEach(player => {
    player.isDrawing = false;
  });
  
  // Assign current drawer
  if (playersList.length > 0) {
    const currentDrawer = playersList[room.currentDrawerIndex % playersList.length];
    currentDrawer.isDrawing = true;
    console.log(`${currentDrawer.name} is now drawing in room ${room.id}`);
  }
}

function nextRound(room) {
  // Move to next player
  room.currentDrawerIndex = (room.currentDrawerIndex + 1) % room.players.size;
  room.roundNumber++;
  
  // Get new word and reset timer
  room.currentWord = getRandomWord();
  room.timeLeft = 60;
  
  // Assign new drawing roles
  assignDrawingRoles(room);
  
  // Start new timer
  stopRoomTimer(room);
  startRoomTimer(room);
  
  // Clear canvas for new round
  io.to(room.id).emit('clear-canvas');
  
  console.log(`Room ${room.id} - Round ${room.roundNumber}, new word: ${room.currentWord}`);
  
  // Notify all players of new round
  io.to(room.id).emit('new-round', {
    currentWord: room.currentWord,
    players: Array.from(room.players.values()),
    roundNumber: room.roundNumber,
    timeLeft: room.timeLeft
  });
}

function handleCorrectGuess(room, guessingPlayer, word) {
  // Award points
  guessingPlayer.score += 10; // Points for correct guess
  
  // Find the drawing player and award points
  const drawingPlayer = Array.from(room.players.values()).find(p => p.isDrawing);
  if (drawingPlayer) {
    drawingPlayer.score += 5; // Points for successful drawing
  }
  
  console.log(`Correct guess in room ${room.id}: ${guessingPlayer.name} guessed "${word}"`);
  
  // Notify all players
  io.to(room.id).emit('correct-guess', {
    guessingPlayer: guessingPlayer.name,
    drawingPlayer: drawingPlayer?.name,
    word: word,
    players: Array.from(room.players.values())
  });
  
  // Start next round after a short delay
  setTimeout(() => {
    nextRound(room);
  }, 3000);
}

// Word list for the game
const WORDS = [
  'CAT', 'DOG', 'HOUSE', 'TREE', 'CAR', 'FLOWER', 'BIRD', 'FISH', 'SUN', 'MOON',
  'APPLE', 'BOOK', 'PHONE', 'COMPUTER', 'MUSIC', 'DANCE', 'SOCCER', 'PIZZA', 'GUITAR', 'CAMERA',
  'MOUNTAIN', 'OCEAN', 'RAINBOW', 'BUTTERFLY', 'ELEPHANT', 'ROCKET', 'CASTLE', 'ROBOT', 'DRAGON', 'WIZARD'
];

// Helper function to get random word
function getRandomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

// Helper function to create a new room
function createRoom(hostId, hostName) {
  const roomCode = generateRoomCode();
  const room = {
    id: roomCode,
    host: hostId,
    hostName: hostName, // Store the host name for later comparison
    players: new Map(),
    currentWord: getRandomWord(),
    gameState: 'waiting', // waiting, playing, ended
    timeLeft: 60,
    messages: [],
    timer: null, // Store timer reference
    currentDrawerIndex: 0, // Track whose turn it is to draw
    roundNumber: 1
  };
  
  rooms.set(roomCode, room);
  console.log(`Room ${roomCode} created by ${hostName}`);
  return room;
}

// REST API endpoints
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({
    id: room.id,
    playerCount: room.players.size,
    gameState: room.gameState,
    maxPlayers: 8
  });
});

app.post('/api/rooms', (req, res) => {
  const { playerName } = req.body;
  
  if (!playerName || !playerName.trim()) {
    return res.status(400).json({ error: 'Player name is required' });
  }
  
  const tempId = 'temp_' + Date.now();
  const room = createRoom(tempId, playerName.trim());
  
  res.json({
    roomId: room.id,
    message: 'Room created successfully'
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join room
  socket.on('join-room', ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('join-error', { message: 'Room not found' });
      return;
    }
    
    if (room.players.size >= 8) {
      socket.emit('join-error', { message: 'Room is full' });
      return;
    }
    
    // Check if player name is already taken (except for room creator)
    const existingPlayer = Array.from(room.players.values()).find(p => p.name === playerName);
    if (existingPlayer && existingPlayer.socketId !== socket.id) {
      socket.emit('join-error', { message: 'Player name already taken' });
      return;
    }
    
    // Check if this is the room creator joining for the first time
    const isRoomCreator = room.players.size === 0 && room.hostName === playerName;
    
    // Add player to room
    const player = {
      id: socket.id,
      name: playerName,
      score: 0,
      isDrawing: false, // Will be assigned properly below
      socketId: socket.id
    };
    
    room.players.set(socket.id, player);
    socket.join(roomId);
    
    console.log(`${playerName} joined room ${roomId}${isRoomCreator ? ' (room creator)' : ''}`);
    
    // Assign drawing roles
    assignDrawingRoles(room);
    
    // Check if we should start the timer (2 or more players)
    if (room.players.size >= 2 && room.gameState === 'waiting') {
      room.gameState = 'playing';
      startRoomTimer(room);
      console.log(`Timer started for room ${roomId} - ${room.players.size} players`);
    }
    
    // Notify player of successful join
    socket.emit('join-success', {
      roomId: roomId,
      playerId: socket.id,
      players: Array.from(room.players.values()),
      gameState: room.gameState,
      timeLeft: room.timeLeft,
      currentWord: room.currentWord
    });
    
    // Notify other players
    socket.to(roomId).emit('player-joined', {
      player: player,
      players: Array.from(room.players.values()),
      gameState: room.gameState,
      timeLeft: room.timeLeft
    });
  });
  
  // Handle drawing events
  socket.on('drawing', (data) => {
    // Check if this is a clear canvas event (large size indicating full canvas clear)
    if (data.color === '#FFFFFF' && data.size > 500) {
      // This is a clear canvas event
      socket.to(data.roomId).emit('clear-canvas');
    } else {
      // Regular drawing event
      socket.to(data.roomId).emit('drawing', data);
    }
  });
  
  // Handle chat/guess messages
  socket.on('send-message', ({ roomId, message, type }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const player = room.players.get(socket.id);
    if (!player) return;
    
    // Don't allow the drawing player to guess
    if (player.isDrawing && type === 'guess') {
      return;
    }
    
    const messageData = {
      id: Date.now().toString(),
      player: player.name,
      message: message,
      type: type || 'chat'
    };
    
    room.messages.push(messageData);
    
    // Broadcast message to all players in room
    io.to(roomId).emit('new-message', messageData);
    
    // Check if it's a correct guess
    if (type === 'guess' && room.currentWord && room.gameState === 'playing' &&
        message.toLowerCase() === room.currentWord.toLowerCase()) {
      
      // Stop the current timer
      stopRoomTimer(room);
      
      // Handle the correct guess
      handleCorrectGuess(room, player, room.currentWord);
    }
  });
  
  // Handle leaving room
  socket.on('leave-room', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const player = room.players.get(socket.id);
    if (player) {
      room.players.delete(socket.id);
      socket.leave(roomId);
      
      console.log(`${player.name} left room ${roomId}`);
      
      // If room is empty, delete it
      if (room.players.size === 0) {
        stopRoomTimer(room);
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted - no players remaining`);
      } else {
        // Check if we should stop the timer (less than 2 players)
        if (room.players.size < 2 && room.gameState === 'playing') {
          room.gameState = 'waiting';
          stopRoomTimer(room);
          resetRoomTimer(room);
          console.log(`Timer stopped for room ${roomId} - only ${room.players.size} player(s) remaining`);
        }
        
        // Notify remaining players
        socket.to(roomId).emit('player-left', {
          playerId: socket.id,
          playerName: player.name,
          players: Array.from(room.players.values()),
          gameState: room.gameState,
          timeLeft: room.timeLeft
        });
      }
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find and remove player from any room
    for (const [roomId, room] of rooms.entries()) {
      const player = room.players.get(socket.id);
      if (player) {
        room.players.delete(socket.id);
        
        if (room.players.size === 0) {
          stopRoomTimer(room);
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted - no players remaining`);
        } else {
          // Check if we should stop the timer (less than 2 players)
          if (room.players.size < 2 && room.gameState === 'playing') {
            room.gameState = 'waiting';
            stopRoomTimer(room);
            resetRoomTimer(room);
            console.log(`Timer stopped for room ${roomId} - only ${room.players.size} player(s) remaining`);
          }
          
          // Notify remaining players
          socket.to(roomId).emit('player-left', {
            playerId: socket.id,
            playerName: player.name,
            players: Array.from(room.players.values()),
            gameState: room.gameState,
            timeLeft: room.timeLeft
          });
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server ready for connections`);
  console.log(`Access from mobile at: http://192.168.1.11:${PORT}`);
}); 