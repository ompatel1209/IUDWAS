import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

/**
 * ============================================================================
 * Live Updates (SSE) — LiveUpdatesContext.tsx
 * ============================================================================
 *
 * The backend pushes "something changed" signals (document uploaded, approval
 * step done, notification arrived…) over a Server-Sent-Events stream. This
 * provider owns ONE EventSource per open session and exposes:
 *
 *   - <LiveUpdatesProvider>     — mount once (AppLayout)
 *   - useLiveConnection()       — { connected } for UI indicators
 *   - useLiveEvents(types, cb)  — page-level refetch subscriptions
 *
 * Events carry no confidential data; every subscriber refetches its own
 * permissioned API endpoints, so visibility rules stay enforced server-side.
 */

export interface LiveEvent {
  type: string;
  resource: string;
  id?: string;
  actor_user_id?: string;
  target_user_id?: string;
  occurred_at: string;
}

interface LiveUpdatesContextValue {
  connected: boolean;
}

const LiveUpdatesContext = createContext<LiveUpdatesContextValue>({ connected: false });

export const useLiveConnection = (): LiveUpdatesContextValue => useContext(LiveUpdatesContext);

/** Matches publishLiveEvent() types in the backend service. */
const LIVE_EVENT_TYPES = [
  'document:changed',
  'workflow:changed',
  'notification:changed',
  'user:changed',
  'system:changed',
];

const RECONNECT_DELAYS_MS = [1000, 3000, 6000, 15000, 30000];

export const LiveUpdatesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const token = localStorage.getItem('iudwas_token');
      if (!token) {
        // Not logged in yet (login screen) — try again after a short wait
        timerRef.current = setTimeout(connect, 5000);
        return;
      }

      const es = new EventSource(`/api/v1/system/events?token=${encodeURIComponent(token)}`);
      sourceRef.current = es;

      es.addEventListener('hello', () => {
        attemptRef.current = 0;
        setConnected(true);
      });

      // Every change signal is mirrored onto window as 'iudwas:live'
      LIVE_EVENT_TYPES.forEach((type) => {
        es.addEventListener(type, (ev: MessageEvent) => {
          setConnected(true);
          try {
            const detail = JSON.parse((ev as MessageEvent).data) as LiveEvent;
            window.dispatchEvent(new CustomEvent<LiveEvent>('iudwas:live', { detail }));
          } catch {
            // malformed frame — ignore, next heartbeat reconnects state
          }
        });
      });

      es.onerror = () => {
        setConnected(false);
        // EventSource retries by itself, but when the server is fully gone it
        // reaches CLOSED — take over with our own bounded backoff (max 30s)
        if (es.readyState === EventSource.CLOSED) {
          es.close();
          if (disposed) return;
          const delay = RECONNECT_DELAYS_MS[Math.min(attemptRef.current, RECONNECT_DELAYS_MS.length - 1)];
          attemptRef.current += 1;
          timerRef.current = setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, []);

  return <LiveUpdatesContext.Provider value={{ connected }}>{children}</LiveUpdatesContext.Provider>;
};

/**
 * Page-level subscription: refetches (debounced) whenever any of `types`
 * fires. Handler runs late-bound so pages can pass inline closures.
 */
export function useLiveEvents(types: string[], handler: () => void, debounceMs = 600): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const key = types.join('|');
    if (!key) return undefined;

    const dispatch = (ev: Event) => {
      const detail = (ev as CustomEvent<LiveEvent>).detail;
      if (!detail || !types.includes(detail.type)) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => handlerRef.current(), debounceMs);
    };
    window.addEventListener('iudwas:live', dispatch as EventListener);
    return () => {
      window.removeEventListener('iudwas:live', dispatch as EventListener);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // types identity changes every render — join() keeps the effect stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types, debounceMs]);
}
