import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../utils/constants';
import { getAccessToken } from './api';

let socket: Socket | null = null;

type EventHandler = (...args: unknown[]) => void;
const eventHandlers: Map<string, Set<EventHandler>> = new Map();

// --- Connection state ---
export type SocketConnectionStatus = 'connected' | 'connecting' | 'disconnected';

type StatusListener = (status: SocketConnectionStatus) => void;
const statusListeners = new Set<StatusListener>();
let currentStatus: SocketConnectionStatus = 'disconnected';

function setStatus(status: SocketConnectionStatus) {
  if (status === currentStatus) return;
  currentStatus = status;
  statusListeners.forEach((listener) => listener(status));
}

export function getSocketStatus(): SocketConnectionStatus {
  return currentStatus;
}

export function onSocketStatusChange(listener: StatusListener): () => void {
  statusListeners.add(listener);
  return () => { statusListeners.delete(listener); };
}

// --- Auth event callbacks ---
let onAuthExpired: (() => void) | null = null;

export function setOnAuthExpired(handler: (() => void) | null): void {
  onAuthExpired = handler;
}

// --- Socket lifecycle ---
export function connectSocket(): void {
  if (socket?.connected) return;

  // Socket.io-client ignores the URL pathname and defaults to "/socket.io" at
  // host root. When API_BASE_URL has a prefix (e.g. ".../parent-helper"), we
  // must pass that prefix explicitly via `path`, otherwise the connection goes
  // to the wrong upstream behind the reverse proxy.
  const url = new URL(API_BASE_URL);
  const basePath = url.pathname.replace(/\/+$/, '');

  setStatus('connecting');

  socket = io(url.origin, {
    path: basePath ? `${basePath}/socket.io` : '/socket.io',
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    timeout: 20000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    setStatus('connected');
    const token = getAccessToken();
    if (token) {
      socket?.emit('join:parent', token);
    }
  });

  socket.on('disconnect', (reason) => {
    setStatus('disconnected');
    // If the server forcefully closed the connection, it won't auto-reconnect
    if (reason === 'io server disconnect') {
      socket?.connect();
    }
  });

  socket.on('connect_error', () => {
    setStatus('disconnected');
  });

  // Auth expired/revoked — trigger token refresh or logout
  socket.on('auth:expired', () => {
    onAuthExpired?.();
  });

  socket.on('auth:revoked', () => {
    onAuthExpired?.();
  });

  socket.io.on('reconnect_attempt', () => {
    setStatus('connecting');
  });

  socket.io.on('reconnect', () => {
    setStatus('connected');
  });

  // Re-emit stored handlers
  const forward = (event: string) => {
    socket?.on(event, (...args: unknown[]) => {
      const handlers = eventHandlers.get(event);
      handlers?.forEach((handler) => handler(...args));
    });
  };

  forward('alert:new');
  // Backend emits 'alert:sos' for SOS events; surface it both as 'alert:sos'
  // and as a regular 'alert:new' so existing alerts UI updates without extra wiring.
  socket.on('alert:sos', (...args: unknown[]) => {
    eventHandlers.get('alert:sos')?.forEach((handler) => handler(...args));
    eventHandlers.get('alert:new')?.forEach((handler) => handler(...args));
  });
  forward('location:update');
  forward('rules:updated');
  forward('device:paired');
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  setStatus('disconnected');
}

export function onSocketEvent(event: string, handler: EventHandler): () => void {
  if (!eventHandlers.has(event)) {
    eventHandlers.set(event, new Set());
  }
  eventHandlers.get(event)!.add(handler);

  // Return unsubscribe function
  return () => {
    eventHandlers.get(event)?.delete(handler);
  };
}
