import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../utils/constants';
import { getAccessToken } from './api';

let socket: Socket | null = null;

type EventHandler = (...args: unknown[]) => void;
const eventHandlers: Map<string, Set<EventHandler>> = new Map();

export function connectSocket(): void {
  if (socket?.connected) return;

  socket = io(API_BASE_URL, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    timeout: 20000,
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    const token = getAccessToken();
    if (token) {
      socket?.emit('join:parent', token);
    }
  });

  // Re-emit stored handlers
  socket.on('alert:new', (...args: unknown[]) => {
    const handlers = eventHandlers.get('alert:new');
    handlers?.forEach((handler) => handler(...args));
  });

  socket.on('location:update', (...args: unknown[]) => {
    const handlers = eventHandlers.get('location:update');
    handlers?.forEach((handler) => handler(...args));
  });

  socket.on('rules:updated', (...args: unknown[]) => {
    const handlers = eventHandlers.get('rules:updated');
    handlers?.forEach((handler) => handler(...args));
  });
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
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
