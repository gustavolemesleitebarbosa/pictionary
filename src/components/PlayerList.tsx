
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Palette } from 'lucide-react';
import { type Player } from '../services/socketService';

interface PlayerListProps {
  players: Player[];
}

const PlayerList: React.FC<PlayerListProps> = ({ players }) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          Players
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between p-3 rounded-lg transition-all ${
              player.isDrawing
                ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                index === 0 ? 'bg-yellow-400' : 
                index === 1 ? 'bg-gray-400' : 
                index === 2 ? 'bg-orange-400' : 'bg-blue-400'
              }`} />
              <span className="font-medium">{player.name}</span>
              {player.isDrawing && (
                <Badge variant="secondary" className="text-xs">
                  <Palette className="w-3 h-3 mr-1" />
                  Drawing
                </Badge>
              )}
            </div>
            <div className="font-bold text-lg text-blue-600">
              {player.score}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PlayerList;
