
import React, { useState } from 'react';
import GameLobby from '../components/GameLobby';
import GameRoom from '../components/GameRoom';

const Index = () => {
  const [gameState, setGameState] = useState<'lobby' | 'room'>('lobby');
  const [currentRoom, setCurrentRoom] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');

  const handleJoinRoom = (roomId: string, name: string) => {
    setCurrentRoom(roomId);
    setPlayerName(name);
    setGameState('room');
  };

  const handleLeaveRoom = () => {
    setGameState('lobby');
    setCurrentRoom('');
    setPlayerName('');
  };

  return (
    <>
      {gameState === 'lobby' ? (
        <GameLobby onJoinRoom={handleJoinRoom} />
      ) : (
        <GameRoom
          roomId={currentRoom}
          playerName={playerName}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </>
  );
};

export default Index;
