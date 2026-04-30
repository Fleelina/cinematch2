import { io } from 'socket.io-client';
import { getToken } from './tokenStore';
import Constants from 'expo-constants';

const SOCKET_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';

let socket = null;

export const connectSocket = async () => {
  if (socket?.connected) return socket;

  const token = getToken();
  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket bağlandı:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket bağlantı hatası:', err.message);
  });

  socket.on('disconnect', () => {
    console.log('Socket bağlantısı kesildi');
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const sendMessage = (matchId, text, movieId) => {
  if (!socket?.connected) return;
  socket.emit('send_message', { matchId, text, movieId });
};

export const emitTyping = (matchId) => {
  if (!socket?.connected) return;
  socket.emit('typing', { matchId });
};

export const emitStopTyping = (matchId) => {
  if (!socket?.connected) return;
  socket.emit('stop_typing', { matchId });
};
