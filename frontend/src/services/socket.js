import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:8000'; // Adjust if backend runs elsewhere

const socket = io(SOCKET_URL, {
  autoConnect: true, // Let socket.io handle connection automatically
});                                                                                                                                                  

export default socket;
