import React from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ChatBubbleProps {
  message: {
    id: string;
    senderUsername: string;
    content: string;
    timestamp: string;
    isOwnMessage: boolean;
  };
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const messageTime = new Date(message.timestamp);
  const formattedTime = format(messageTime, 'HH:mm', { locale: vi });

  return (
    <div className={`flex items-start gap-3 ${message.isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {!message.isOwnMessage && (
        <img 
          src={`https://api.dicebear.com/7.x/initials/svg?seed=${message.senderUsername}`} 
          alt={message.senderUsername}
          className="size-8 rounded-full bg-muted object-cover shrink-0"
        />
      )}
      <div className={`flex max-w-[70%] flex-col rounded-xl px-4 py-2 text-sm ${message.isOwnMessage ? 'rounded-br-none bg-primary text-primary-foreground' : 'rounded-bl-none bg-muted/70 text-foreground'}`}>
        {!message.isOwnMessage && <div className="mb-1 text-xs font-bold text-muted-foreground">{message.senderUsername}</div>}
        <p className="break-words leading-relaxed">{message.content}</p>
        <span className={`mt-1.5 text-[10px] font-medium ${message.isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'} self-end`}>{formattedTime}</span>
      </div>
      {message.isOwnMessage && (
        <img 
          src={`https://api.dicebear.com/7.x/initials/svg?seed=${message.senderUsername}`} 
          alt={message.senderUsername}
          className="size-8 rounded-full bg-muted object-cover shrink-0"
        />
      )}
    </div>
  );
};
