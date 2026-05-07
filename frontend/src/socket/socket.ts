// src/socket/socket.ts
import { io, Socket } from 'socket.io-client';
import { getToken } from '@/api/api';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

let socket: Socket | null = null;

// 🚨 FIX 1: Create a memory bank for active channel rooms
// This tracks channelId -> userId
const activeRooms = new Map<string, string>(); 

export const getSocket = () => {
  const token = getToken();

  if (!socket) {
    if (!token) return null; // Don't connect if we don't have a token yet

    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: {
        token: token ? `Bearer ${token}` : null,
      },
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to server:', socket?.id);

      // 🚨 FIX 2: Automatically re-join all active rooms upon connection/reconnection
      if (activeRooms.size > 0) {
        console.log(`[Socket] Re-joining ${activeRooms.size} active rooms...`);
        activeRooms.forEach((userId, channelId) => {
          socket?.emit('channel:join', { channelId, userId });
        });
      }
    });

    socket.on('connect_error', async (err) => {
      console.error('[Socket] Connection error:', err.message);
      const errMsg = err.message.toLowerCase();
      
      if (['auth', 'jwt', 'token', 'expired'].some(k => errMsg.includes(k))) {
        socket?.disconnect(); 
        
        try {
          console.log('[Socket] Auth error. Triggering Axios check...');
          const { default: api } = await import('@/api/api');
          
          // This triggers the Axios 401 interceptor if the token is truly expired.
          // The interceptor will fire 'token_refreshed' and handle reconnection automatically!
          await api.get('/auth/profile'); 
          
          // 🚨 FIX 2: Only reconnect manually if the socket is STILL disconnected.
          // This happens if api.get('/auth/profile') succeeds WITHOUT needing a refresh 
          // (meaning the access token was fine, but the socket had a separate hiccup).
          if (socket && socket.disconnected) {
            const newToken = getToken();
            if (newToken) {
              socket.auth = { token: `Bearer ${newToken}` };
              socket.connect();
              console.log('[Socket] Reconnected cleanly without refresh.');
            }
          }
        } catch {
          console.error('[Socket] Session completely expired. Socket will remain disconnected.');
        }
      }
    });
  } else if (token) {
    // If socket exists but token was updated/missing, update auth and reconnect
    const currentToken = socket.auth && (socket.auth as { token?: string }).token;
    const newToken = `Bearer ${token}`;
    
    if (currentToken !== newToken) {
      socket.auth = { token: newToken };
      socket.disconnect().connect();
      console.log('[Socket] Token updated, reconnected.');
    }
  }

  return socket;
};

export const joinChannelRoom = (channelId: string, userId: string) => {
  // 🚨 FIX 3: Save the room to memory when joining
  activeRooms.set(channelId, userId);

  const activeSocket = getSocket();
  if (!activeSocket) return null;
  
  if (activeSocket.connected) {
    activeSocket.emit('channel:join', { channelId, userId });
  } else {
    activeSocket.once('connect', () => {
      activeSocket.emit('channel:join', { channelId, userId });
    });
  }
  
  return activeSocket;
};

export const leaveChannelRoom = (channelId: string, userId: string) => {
  // 🚨 FIX 4: Remove the room from memory when leaving (e.g., component unmounts)
  activeRooms.delete(channelId);

  const activeSocket = getSocket();
  if (!activeSocket) return;
  activeSocket.emit('channel:leave', { channelId, userId });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    activeRooms.clear(); // Clear memory on full disconnect
  }
};

// Global listener for token refresh events from Axios interceptor
if (typeof window !== 'undefined') {
  window.addEventListener('token_refreshed', () => {
    console.log('[Socket] Token refreshed event received. Syncing socket...');
    if (socket) {
      const token = getToken();
      if (token) {
        socket.auth = { token: `Bearer ${token}` };
        
        // 🚨 FIX 3: Safe reconnect based on current state to avoid overlapping connections
        if (socket.disconnected) {
          socket.connect();
        } else {
          socket.disconnect().connect();
        }
      }
    } else {
      getSocket();
    }
  });
}

