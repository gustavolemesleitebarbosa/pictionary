
import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, CheckCircle } from 'lucide-react';
import { type MessageData } from '../services/socketService';

interface ChatBoxProps {
  messages: MessageData[];
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card className="h-64">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageCircle className="w-4 h-4" />
          Guesses & Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 h-48 overflow-y-auto space-y-2">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center">No messages yet...</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`p-2 rounded-lg text-sm ${
                message.type === 'guess'
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className="font-medium text-blue-600">
                    {message.player}:
                  </span>
                  <span className="ml-2">{message.message}</span>
                </div>
                {message.type === 'guess' && (
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Guess
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>
    </Card>
  );
};

export default ChatBox;
