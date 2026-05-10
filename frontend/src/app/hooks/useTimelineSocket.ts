import { useEffect, useRef, useState } from 'react';

type SocketCallback = (message: any) => void;
export function useTimelineSocket(tripId: string, token: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!tripId || !token) return;

    // Use environment variable or default to 8081 for the Go Proxy
    const wsUrl = `ws://localhost:8081/ws/timeline/${tripId}?token=${token}`;
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('Connected to timeline workspace');
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received timeline event:', data);
        setLastMessage(data);
      } catch (error) {
        console.error('Failed to parse websocket message:', error);
      }
    };

    socket.onclose = () => {
      console.log('Disconnected from timeline workspace');
      setIsConnected(false);
    };

    ws.current = socket;

    return () => {
      socket.close();
    };
  }, [tripId, token]);

  const sendEvent = (actionType: string, payload: any) => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify({
        type: actionType,
        data: payload,
        timestamp: Date.now()
      }));
    }
  };

  return { isConnected, lastMessage, sendEvent };
}
