import { io, Socket } from 'socket.io-client';

// Determine the backend URL depending on the environment
const backendUrl = import.meta.env.PROD 
  ? window.location.origin 
  : 'http://localhost:3001';

export const socket: Socket = io(backendUrl, {
  transports: ['websocket'], // production optimization as requested
  autoConnect: false, // connect manually when a room is joined
});
