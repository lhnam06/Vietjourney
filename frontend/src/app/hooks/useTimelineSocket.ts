import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type SocketCallback = (message: any) => void;
export function useTimelineSocket(tripId: string, token: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!tripId || !token) return;

    const DEFAULT_WS = 'ws://localhost:8081';
    const WS_BASE = (import.meta.env.VITE_WS_URL as string | undefined)?.replace(/\/$/, '') || DEFAULT_WS;
    const wsUrl = `${WS_BASE}/ws/timeline/${tripId}?token=${token}`;

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

  const sendProposal = (timelineId: string, baseVersion: number, changeType: string, payload: any) => {
    if (ws.current && isConnected) {
      console.log("[Socket] Sending proposal:", { type: changeType, timelineId });
      ws.current.send(JSON.stringify({
        type: 'PROPOSAL_SUBMIT',
        timeline_id: timelineId,
        base_version: baseVersion,
        payload: {
          action: changeType,
          data: payload
        },
        token: token
      }));
    } else {
      console.warn("[Socket] Cannot send proposal: Not connected", { isConnected, hasWs: !!ws.current });
      toast.error("Mất kết nối với máy chủ đồng bộ. Vui lòng thử lại sau giây lát.");
    }
  };

  return { isConnected, lastMessage, sendEvent, sendProposal };
}
