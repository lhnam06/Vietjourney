import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { buildWsUrl } from '../lib/wsConfig';

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

    const wsUrl = buildWsUrl('/ws/notifications', { token });
    if (!wsUrl) {
      setIsConnected(false);
      return;
    }

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsConnected(true);
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
    };

    socket.onerror = () => {
      setIsConnected(false);
    };

    ws.current = socket;

    return () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      ws.current = null;
    };
  }, [isAuthenticated, token]);

  return { lastEvent, isConnected };
}
