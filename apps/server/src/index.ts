import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { RoomData, SOCKET_EVENTS, MAX_TEXT_LENGTH } from '@realtime-clipboard/shared';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For dev, in prod we'll serve static from same origin
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json());

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  const webDistPath = path.join(__dirname, '../../web/dist');
  app.use(express.static(webDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
}

// In-memory room store: roomId -> RoomData
const rooms = new Map<string, RoomData>();

io.on('connection', (socket) => {
  let currentRoom: string | null = null;
  
  socket.on(SOCKET_EVENTS.JOIN_ROOM, ({ roomId }) => {
    if (!roomId || typeof roomId !== 'string' || roomId.length > 50) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid room ID' });
      return;
    }

    // Leave previous room if any
    if (currentRoom) {
      socket.leave(currentRoom);
      
      const prevRoom = rooms.get(currentRoom);
      if (prevRoom) {
        prevRoom.users = Math.max(0, prevRoom.users - 1);
        io.to(currentRoom).emit(SOCKET_EVENTS.ROOM_DATA, prevRoom);
      }
    }

    socket.join(roomId);
    currentRoom = roomId;

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { text: '', users: 0 });
    }
    
    const room = rooms.get(roomId)!;
    room.users += 1;
    
    // Broadcast updated room data (like user count) and initial text to the newly joined user
    socket.emit(SOCKET_EVENTS.ROOM_DATA, room); // send to self
    socket.to(roomId).emit(SOCKET_EVENTS.ROOM_DATA, room); // broadcast to others
  });

  socket.on(SOCKET_EVENTS.TEXT_UPDATE, ({ roomId, text }) => {
    if (!roomId || currentRoom !== roomId) return;
    
    if (typeof text !== 'string' || text.length > MAX_TEXT_LENGTH) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid text payload length' });
      return;
    }

    const room = rooms.get(roomId);
    if (room) {
      room.text = text;
      // Broadcast to everyone else in the room
      socket.to(roomId).emit(SOCKET_EVENTS.TEXT_UPDATE, { roomId, text });
    }
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.users = Math.max(0, room.users - 1);
        io.to(currentRoom).emit(SOCKET_EVENTS.ROOM_DATA, room);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
