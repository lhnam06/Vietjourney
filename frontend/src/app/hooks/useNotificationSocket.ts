import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export interface NotificationSocketEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  category: string;
  payload?: any;
  status: string;
  createdAt: string;
}

export function useNotificationSocket() {
  const { token, isAuthenticated } = useAuth();
  const [lastEvent, setLastEvent] = useState<NotificationSocketEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      setIsConnected(false);
      return;
    }

    const DEFAULT_WS = 'ws://localhost:8081';
    const WS_BASE = (import.meta.env.VITE_WS_URL as string | undefined)?.replace(/\/$/, '') || DEFAULT_WS;
    const wsUrl = `${WS_BASE}/ws/notifications?token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsConnected(true);
      console.log('Connected to notification socket');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent(data);
      } catch (err) {
        console.error('Failed to parse notification message', err);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log('Notification socket closed');
    };

    socket.onerror = (error) => {
      console.error('Notification socket error:', error);
    };

    ws.current = socket;

    return () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, [isAuthenticated, token]);

  return { lastEvent, isConnected };
}
