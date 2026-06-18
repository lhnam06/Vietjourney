import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';
import { getChatHistory, sendChatMessage, type ChatMessage } from '../lib/chatApi';
import { useTimelineSocket } from '../hooks/useTimelineSocket';
import { ChatBubble } from './ChatBubble';
import { getAuthToken } from '../lib/authApi';
import { fetchCurrentUser, type CurrentUser } from '../lib/timelineApi';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  timelineId: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose, timelineId }) => {
  const token = getAuthToken() || '';
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { lastMessage } = useTimelineSocket(timelineId, token);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && !currentUser) {
      fetchCurrentUser().then(setCurrentUser).catch(console.error);
    }
  }, [isOpen, currentUser]);

  const fetchMessages = useCallback(async () => {
    if (token) {
      try {
        const history = await getChatHistory(timelineId, token);
        setMessages(history);
        messageIdsRef.current = new Set(history.map((m) => m.id));
      } catch (error) {
        console.error('Failed to fetch chat history:', error);
      }
    }
  }, [timelineId, token]);

  useEffect(() => {
    if (isOpen) {
      void fetchMessages();
    }
  }, [isOpen, fetchMessages]);

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
    if (newMessage.trim() === '' || !token || !currentUser) return;

    try {
      const savedMessage = await sendChatMessage(timelineId, token, newMessage);
      if (savedMessage?.id && !messageIdsRef.current.has(savedMessage.id)) {
        messageIdsRef.current.add(savedMessage.id);
        setMessages((prev) => [...prev, savedMessage]);
      }
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 py-6 backdrop-blur-sm">
      <section className="flex h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_oklch(0.23_0.04_260_/_0.35)]">
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-foreground">Trò chuyện nhóm</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={{ ...msg, isOwnMessage: msg.senderId === currentUser?.id, timestamp: msg.timestamp }}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t border-border p-4 bg-accent/30">
          <input
            type="text"
            placeholder="Nhập tin nhắn..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button 
            type="submit" 
            disabled={newMessage.trim() === ''}
            className="inline-flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="size-5" />
          </button>
        </form>
      </section>
    </div>
  );
};
