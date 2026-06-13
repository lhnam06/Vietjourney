import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router';
import { Send, XCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useAuth } from '../context/AuthContext';
import { getChatHistory, sendChatMessage, type ChatMessage } from '../lib/chatApi';
import { useTimelineSocket } from '../hooks/useTimelineSocket';
import { ChatBubble } from './ChatBubble';
import { toast } from 'sonner';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  timelineId: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose, timelineId }) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { lastMessage } = useTimelineSocket(timelineId, token);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Track IDs we already have to avoid duplicate lookups in effects
  const messageIdsRef = useRef<Set<string>>(new Set());

  // Helper: add one-or-many messages, deduping by id
  const addMessages = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !ids.has(m.id));
      if (fresh.length === 0) return prev;
      fresh.forEach((m) => ids.add(m.id));
      messageIdsRef.current = ids;
      return [...prev, ...fresh];
    });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (token) {
      try {
        const history = await getChatHistory(timelineId, token);
        setMessages(history);
        messageIdsRef.current = new Set(history.map((m) => m.id));
      } catch (error) {
        console.error('Failed to fetch chat history:', error);
        toast.error('Không tải được lịch sử trò chuyện.');
      }
    }
  }, [timelineId, token]);

  useEffect(() => {
    if (isOpen) {
      void fetchMessages();
    }
  }, [isOpen, fetchMessages]);

  // Incoming real-time messages from WebSocket (sent by other users)
  useEffect(() => {
    if (lastMessage?.type === 'CHAT_MESSAGE') {
      const msg = lastMessage.data as ChatMessage;
      if (msg?.id && !messageIdsRef.current.has(msg.id)) {
        messageIdsRef.current.add(msg.id);
        setMessages((prev) => [...prev, msg]);
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !token || !user) return;

    try {
      // POST the message and optimistically add it to the UI from the API response
      // This way it shows immediately regardless of WebSocket health
      const savedMessage = await sendChatMessage(timelineId, token, newMessage);
      if (savedMessage?.id && !messageIdsRef.current.has(savedMessage.id)) {
        messageIdsRef.current.add(savedMessage.id);
        setMessages((prev) => [...prev, savedMessage]);
      }
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Không gửi được tin nhắn.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b border-slate-200">
          <DialogTitle>Trò chuyện nhóm</DialogTitle>
          <button onClick={onClose} className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <XCircle className="h-6 w-6 text-slate-500 hover:text-slate-700" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>
        <ScrollArea className="flex-1 p-4">
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={{ ...msg, isOwnMessage: msg.senderId === user?.id, timestamp: msg.timestamp }}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-4 border-t border-slate-200">
          <Input
            placeholder="Nhập tin nhắn..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={newMessage.trim() === ''}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
