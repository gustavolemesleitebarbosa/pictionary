import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DrawingCanvas from './DrawingCanvas';
import PlayerList from './PlayerList';
import ChatBox from './ChatBox';
import { Palette, Users, Clock, AlertCircle } from 'lucide-react';
import { socketService, type Player, type MessageData } from '../services/socketService';

interface GameRoomProps {
  roomId: string;
  playerName: string;
  onLeaveRoom: () => void;
}

const GameRoom: React.FC<GameRoomProps> = ({ roomId, playerName, onLeaveRoom }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentWord, setCurrentWord] = useState('CAT');
  const [timeLeft, setTimeLeft] = useState(60);
  const [guess, setGuess] = useState('');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [gameState, setGameState] = useState<'waiting' | 'playing'>('waiting');
  const [roundNumber, setRoundNumber] = useState(1);
  const [showCorrectGuess, setShowCorrectGuess] = useState<string>('');

  const currentPlayer = players.find(p => p.name === playerName);
  const isMyTurn = currentPlayer?.isDrawing || false;
  const isWaitingForPlayers = gameState === 'waiting' || players.length < 2;

  useEffect(() => {
    // Join the room when component mounts
    const joinRoom = () => {
      socketService.joinRoom(roomId, playerName, {
        onSuccess: (data) => {
          console.log('Successfully joined room:', data);
          setPlayers(data.players);
          setGameState(data.gameState || 'waiting');
          setTimeLeft(data.timeLeft || 60);
          setCurrentWord(data.currentWord || 'CAT');
          setIsConnected(true);
          setConnectionError('');
        },
        onError: (error) => {
          console.error('Failed to join room:', error);
          setConnectionError(error);
        }
      });
    };

    joinRoom();

    // Set up socket event listeners
    const setupSocketListeners = () => {
      // Listen for new players joining
      socketService.onPlayerJoined((data) => {
        console.log('Player joined:', data);
        setPlayers(data.players);
        if (data.gameState) setGameState(data.gameState);
        if (data.timeLeft !== undefined) setTimeLeft(data.timeLeft);
      });

      // Listen for players leaving
      socketService.onPlayerLeft((data) => {
        console.log('Player left:', data);
        setPlayers(data.players);
        if (data.gameState) setGameState(data.gameState);
        if (data.timeLeft !== undefined) setTimeLeft(data.timeLeft);
      });

      // Listen for new messages
      socketService.onNewMessage((message) => {
        console.log('New message:', message);
        setMessages(prev => [...prev, message]);
      });

      // Listen for correct guesses
      socketService.onCorrectGuess((data) => {
        console.log('Correct guess:', data);
        setPlayers(data.players);
        setShowCorrectGuess(`${data.guessingPlayer} guessed "${data.word}" correctly!`);
        
        // Hide the message after 3 seconds
        setTimeout(() => {
          setShowCorrectGuess('');
        }, 3000);
      });

      // Listen for new rounds
      socketService.onNewRound((data) => {
        console.log('New round:', data);
        setPlayers(data.players);
        setCurrentWord(data.currentWord);
        setRoundNumber(data.roundNumber);
        setTimeLeft(data.timeLeft);
        setShowCorrectGuess(''); // Clear any correct guess message
      });

      // Listen for timer updates from server
      const socket = socketService.getSocket();
      if (socket) {
        socket.on('timer-update', (data: { timeLeft: number }) => {
          setTimeLeft(data.timeLeft);
        });

        socket.on('round-ended', () => {
          console.log('Round ended');
          // Handle round end logic here
        });
      }
    };

    setupSocketListeners();

    // Cleanup on unmount
    return () => {
      socketService.leaveRoom(roomId);
      socketService.removeAllListeners();
    };
  }, [roomId, playerName]);

  // Timer is now managed by the server

  const handleGuess = () => {
    if (guess.trim() && !isMyTurn && isConnected) {
      // Send guess through socket
      socketService.sendMessage(roomId, guess, 'guess');
      setGuess('');
    }
  };

  const handleLeaveRoom = () => {
    socketService.leaveRoom(roomId);
    socketService.disconnect();
    onLeaveRoom();
  };

  // Show connection error if any
  if (connectionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Connection Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{connectionError}</p>
            <Button onClick={handleLeaveRoom} variant="outline" className="w-full">
              Back to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while connecting
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Connecting to room {roomId}...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between mb-6 gap-3 p-3 md:p-4 bg-white/50 rounded-lg backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Button variant="outline" onClick={handleLeaveRoom} className="text-xs md:text-sm">
              ← Leave Room
            </Button>
            <Badge variant="secondary" className="text-xs md:text-sm px-2 md:px-3 py-1">
              <Users className="w-3 h-3 md:w-4 md:h-4 mr-1" />
              {roomId}
            </Badge>
            <Badge variant="outline" className="text-xs px-2 py-1">
              {players.length} player{players.length !== 1 ? 's' : ''}
            </Badge>
            {!isWaitingForPlayers && (
              <Badge variant="secondary" className="text-xs px-2 py-1">
                Round {roundNumber}
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {isWaitingForPlayers ? (
              <Badge variant="outline" className="text-xs md:text-sm px-2 md:px-3 py-1">
                <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                Waiting...
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs md:text-sm px-2 md:px-3 py-1">
                <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                {timeLeft}s
              </Badge>
            )}
            {isMyTurn && !isWaitingForPlayers && (
              <Badge className="text-xs md:text-sm px-2 md:px-3 py-1 bg-green-500">
                <Palette className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                Draw: {currentWord}
              </Badge>
            )}
          </div>
        </div>

        {/* Correct Guess Notification */}
        {showCorrectGuess && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
            <Card className="bg-green-500 text-white shadow-2xl animate-bounce">
              <CardContent className="p-4 text-center">
                <p className="font-bold text-lg">{showCorrectGuess}</p>
                <p className="text-sm">Next round starting soon...</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Canvas Area */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                <CardTitle className="text-center text-sm md:text-base">
                  {isMyTurn ? `Draw: ${currentWord}` : 'Guess what\'s being drawn!'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 md:p-4">
                <DrawingCanvas isDrawing={isMyTurn} roomId={roomId} />
              </CardContent>
            </Card>

            {/* Guess Input (Mobile/Web responsive) */}
            {!isMyTurn && (
              <Card className="mt-4">
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Input
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      placeholder="Enter your guess..."
                      onKeyPress={(e) => e.key === 'Enter' && handleGuess()}
                      className="text-lg"
                    />
                    <Button onClick={handleGuess} className="px-6" disabled={!guess.trim()}>
                      Guess!
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <PlayerList players={players} />
            <ChatBox messages={messages} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom;
