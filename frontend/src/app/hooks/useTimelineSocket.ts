import { useEffect, useRef, useState } from 'react';
import { buildWsUrl } from '../lib/wsConfig';

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_RETRIES = 10;

function parseSocketPayload(raw: string) {
  try {
    return unwrapRedisPayload(JSON.parse(raw));
  } catch (error) {
    console.error('[TimelineSocket] Failed to parse message:', error);
    return null;
  }
}

function unwrapRedisPayload(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return unwrapRedisPayload(JSON.parse(value));
    } catch {
      return value;
    }
  }

  if (Array.isArray(value)) {
    if (value.length === 2 && typeof value[0] === 'string') {
      return unwrapRedisPayload(value[1]);
    }
    return value.map(unwrapRedisPayload);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, unwrapRedisPayload(entry)]),
    );
  }

  return value;
}

export function useTimelineSocket(tripId: string, token: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useRef((trip: string, tok: string) => {
    // Clear any pending reconnect
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    const wsUrl = buildWsUrl(`/ws/timeline/${encodeURIComponent(trip)}`, { token: tok });
    if (!wsUrl) return;

    // Close previous socket if any
    if (ws.current) {
      ws.current.onopen = null;
      ws.current.onmessage = null;
      ws.current.onclose = null;
      ws.current.close();
    }

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      if (!mountedRef.current) return;
      console.log('[TimelineSocket] Connected to timeline workspace');
      setIsConnected(true);
      reconnectCount.current = 0;
    };

    socket.onmessage = (event) => {
      if (!mountedRef.current) return;
      const data = parseSocketPayload(event.data);
      if (data && typeof data === 'object') {
        console.log('[TimelineSocket] Received event:', (data as { type?: string }).type);
        setLastMessage(data);
      }
    };

    socket.onclose = () => {
      if (!mountedRef.current) return;
      console.log('[TimelineSocket] Disconnected');
      setIsConnected(false);
      ws.current = null;

      // Auto-reconnect with exponential backoff
      if (reconnectCount.current < MAX_RECONNECT_RETRIES) {
        reconnectCount.current++;
        const delay = Math.min(RECONNECT_DELAY_MS * Math.pow(1.5, reconnectCount.current - 1), 15000);
        console.log(`[TimelineSocket] Reconnecting in ${delay}ms (attempt ${reconnectCount.current}/${MAX_RECONNECT_RETRIES})`);
        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current) {
            connect.current(trip, tok);
          }
        }, delay);
      } else {
        console.warn('[TimelineSocket] Max reconnection attempts reached');
      }
    };

    socket.onerror = () => {
      console.error('[TimelineSocket] Connection error');
    };

    ws.current = socket;
  }).current;

  useEffect(() => {
    if (!tripId || !token) return;

    mountedRef.current = true;
    reconnectCount.current = 0;
    connect(tripId, token);

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (ws.current) {
        ws.current.onopen = null;
        ws.current.onmessage = null;
        ws.current.onclose = null;
        ws.current.close();
        ws.current = null;
      }
    };
  }, [tripId, token, connect]);

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
    }
  };

  return { isConnected, lastMessage, sendEvent, sendProposal };
}
