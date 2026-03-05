import { io } from 'socket.io-client';
import { BASE_URL } from '../utils/apiPaths';

const normalizeSocketUrl = (url = '') => String(url).trim().replace(/\/+$/, '');

const SOCKET_URL = normalizeSocketUrl(
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  BASE_URL
);

const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
  transports: ['polling', 'websocket'],
  upgrade: true,
  path: '/socket.io',
  pingInterval: 25000,
  pingTimeout: 20000,
});

// Socket connection event handlers
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

export default socket;
