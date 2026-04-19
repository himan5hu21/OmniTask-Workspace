// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
};

export const joinChannelRoom = (channelId: string, userId: string) => {
  const activeSocket = getSocket();
  activeSocket.emit('channel:join', { channelId, userId });
  return activeSocket;
};

export const leaveChannelRoom = (channelId: string, userId: string) => {
  if (!socket) return;
  socket.emit('channel:leave', { channelId, userId });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
