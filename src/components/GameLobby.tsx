import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Monitor, Plus, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { socketService } from '../services/socketService';

interface GameLobbyProps {
  onJoinRoom: (roomId: string, playerName: string) => void;
}

const GameLobby: React.FC<GameLobbyProps> = ({ onJoinRoom }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoinRoom = async (selectedRoomId: string) => {
    if (!playerName.trim() || !selectedRoomId.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // Check if room exists
      const roomCheck = await socketService.checkRoomExists(selectedRoomId);
      
      if (!roomCheck.exists) {
        setError(roomCheck.error || 'Room not found');
        setIsLoading(false);
        return;
      }
      
      // Proceed to join the room
      onJoinRoom(selectedRoomId, playerName.trim());
    } catch (err) {
      setError('Unable to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewRoom = async () => {
    if (!playerName.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await socketService.createRoom(playerName.trim());
      
      if (result.success && result.roomId) {
        onJoinRoom(result.roomId, playerName.trim());
      } else {
        setError(result.error || 'Failed to create room');
      }
    } catch (err) {
      setError('Unable to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoomIdChange = (value: string) => {
    setRoomId(value.toUpperCase());
    if (error) setError(''); // Clear error when user starts typing
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Pictionary
          </h1>
          <p className="text-xl text-gray-600">
            Draw, Guess, and Have Fun with Friends!
          </p>
          <div className="flex justify-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Mobile Friendly
            </div>
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Web Compatible
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex justify-center">
          {/* Join Game Card */}
          <Card className="shadow-2xl w-full max-w-md">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              <CardTitle className="text-2xl text-center">Join a Game</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Name</label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name..."
                  className="text-lg"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Room Code</label>
                <Input
                  value={roomId}
                  onChange={(e) => handleRoomIdChange(e.target.value)}
                  placeholder="Enter room code (e.g., ROOMABC123)..."
                  className="text-lg font-mono"
                  disabled={isLoading}
                />
                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleJoinRoom(roomId)}
                  disabled={!playerName.trim() || !roomId.trim() || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Join Room
                    </>
                  )}
                </Button>
                <Button
                  onClick={createNewRoom}
                  disabled={!playerName.trim() || isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Room
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How to Play */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-center">How to Play</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="font-semibold">Join a Room</h3>
                <p className="text-sm text-gray-600">
                  Enter your name and join an existing room with a room code or create a new one
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-xl font-bold text-green-600">2</span>
                </div>
                <h3 className="font-semibold">Draw & Guess</h3>
                <p className="text-sm text-gray-600">
                  Take turns drawing words while others try to guess what you're drawing
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-xl font-bold text-purple-600">3</span>
                </div>
                <h3 className="font-semibold">Have Fun!</h3>
                <p className="text-sm text-gray-600">
                  Earn points for correct guesses and creative drawings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GameLobby;
