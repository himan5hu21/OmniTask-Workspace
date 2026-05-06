// src/socket/socket.ts
import { io, Socket } from 'socket.io-client';
import { getToken } from '@/api/api';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

let socket: Socket | null = null;

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
    });

    socket.on('connect_error', async (err) => {
      console.error('[Socket] Connection error:', err.message);
      
      const errMsg = err.message.toLowerCase();
      
      // 1. Better matching: catch "auth", "jwt", "token", or "expired"
      if (
        errMsg.includes('auth') || 
        errMsg.includes('jwt') || 
        errMsg.includes('token') || 
        errMsg.includes('expired')
      ) {
        
        // 2. STOP THE INFINITE LOOP: Forcefully disconnect the socket so it stops retrying
        socket?.disconnect(); 
        
        try {
          console.log('[Socket] Token expired. Triggering Axios refresh interceptor...');
          
          // 3. Make a silent API call to a protected route. 
          // This will fail with a 401, which automatically triggers your existing 
          // Axios global interceptor to call /auth/refresh and get a new token!
          const { default: api } = await import('@/api/api');
          await api.get('/auth/profile'); 
          
          // 4. Once the Axios interceptor finishes successfully, grab the newly saved token
          const newToken = getToken();
          
          if (newToken && socket) {
            // Update the socket's internal auth object with the new valid token
            socket.auth = { token: `Bearer ${newToken}` };
            
            // Turn the socket back on!
            socket.connect();
            console.log('[Socket] Successfully refreshed token and reconnected!');
          }
        } catch {
          // If the Axios interceptor fails to refresh, it means the user's session is fully dead.
          // Axios will automatically redirect them to /login, so we just log it here.
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
  const activeSocket = getSocket();
  if (!activeSocket) return;
  activeSocket.emit('channel:leave', { channelId, userId });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
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
        socket.disconnect().connect();
      }
    } else {
      // If socket wasn't initialized yet, try to initialize it now
      getSocket();
    }
  });
}

