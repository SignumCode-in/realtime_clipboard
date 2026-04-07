import express from 'express';
import http from 'http';
import https from 'https';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { RoomData, SOCKET_EVENTS, MAX_TEXT_LENGTH, FileMetadata, MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@realtime-clipboard/shared';
import compression from 'compression';

const app = express();

// Enable compression
app.use(compression());

// HTTPS redirection (for production)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For dev, in prod we'll serve static from same origin
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 2 * 1024 * 1024 // 2MB to handle larger text payloads
});

app.use(cors());
app.use(express.json());

// Ephemeral File Sharing Setup
const TEMP_DIR = path.join(__dirname, '../temp');
if (fs.existsSync(TEMP_DIR)) {
  // Clear any old files on startup
  fs.readdirSync(TEMP_DIR).forEach(file => {
    fs.unlinkSync(path.join(TEMP_DIR, file));
  });
} else {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// In-memory file storage: fileId -> FileMetadata & local path
interface ExtendedFileMetadata extends FileMetadata {
  localPath: string;
  roomId: string;
}
const ephemeralFiles = new Map<string, ExtendedFileMetadata>();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const isAllowedMimeType = ALLOWED_FILE_TYPES.includes(file.mimetype);
    const isTextExtension = file.originalname.toLowerCase().endsWith('.txt') || 
                           file.originalname.toLowerCase().endsWith('.md') ||
                           file.originalname.toLowerCase().endsWith('.json');
    
    if (isAllowedMimeType || isTextExtension) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  }
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  const roomId = req.body.roomId;

  if (!file || !roomId) {
    return res.status(400).json({ message: 'Missing file or roomId' });
  }

  const fileId = uuidv4();
  // Using relative URL or absolute? Let's use relative for flexibility
  const downloadUrl = `/download/${fileId}`;

  const metadata: ExtendedFileMetadata = {
    fileId,
    fileName: file.originalname,
    fileSize: file.size,
    fileType: file.mimetype,
    uploadedAt: new Date().toISOString(),
    downloadUrl,
    ownerId: req.body.ownerId || 'anonymous',
    localPath: file.path,
    roomId
  };

  ephemeralFiles.set(fileId, metadata);

  // Emit to the room
  io.to(roomId).emit(SOCKET_EVENTS.FILE_AVAILABLE, metadata);

  // Auto-delete after 5 minutes (300,000 ms)
  setTimeout(() => {
    deleteFile(fileId);
  }, 5 * 60 * 1000);

  res.status(200).json(metadata);
});

// File download endpoint
app.get('/download/:fileId', (req, res) => {
  const { fileId } = req.params;
  const fileData = ephemeralFiles.get(fileId);

  if (!fileData || !fs.existsSync(fileData.localPath)) {
    return res.status(404).json({ message: 'File not found or expired' });
  }

  res.download(fileData.localPath, fileData.fileName, (err) => {
    if (err) {
      console.error('Download error:', err);
    }
  });
});

// File deletion endpoint (owner only)
app.post('/delete/:fileId', (req, res) => {
  const { fileId } = req.params;
  const { ownerId } = req.body;
  const fileData = ephemeralFiles.get(fileId);

  if (!fileData) {
    return res.status(404).json({ message: 'File not found' });
  }

  if (fileData.ownerId !== ownerId) {
    return res.status(403).json({ message: 'Unauthorized to delete this file' });
  }

  const roomId = fileData.roomId;
  deleteFile(fileId);

  // Broadcast deletion to others in the room
  io.to(roomId).emit(SOCKET_EVENTS.FILE_DELETED, { fileId });

  res.status(200).json({ message: 'File deleted successfully' });
});

function deleteFile(fileId: string) {
  const fileData = ephemeralFiles.get(fileId);
  if (fileData) {
    if (fs.existsSync(fileData.localPath)) {
      try {
        fs.unlinkSync(fileData.localPath);
      } catch (e) {
        console.error('Error deleting file:', e);
      }
    }
    ephemeralFiles.delete(fileId);
    console.log(`Deleted file: ${fileId}`);
  }
}

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

    // Send existing files in the room to the newly joined user
    const existingFiles = Array.from(ephemeralFiles.values())
      .filter(f => f.roomId === roomId);

    existingFiles.forEach(file => {
      socket.emit(SOCKET_EVENTS.FILE_AVAILABLE, file);
    });
  });

  socket.on(SOCKET_EVENTS.TEXT_UPDATE, ({ roomId, text }) => {
    if (!roomId || currentRoom !== roomId) return;

    if (typeof text !== 'string' || text.length > MAX_TEXT_LENGTH) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Text payload too large (max 1MB). Use File Transfer for bigger content.' });
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

// Self-ping to keep the server awake on Render's free tier
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_EXTERNAL_URL) {
  // Use a slightly shorter interval than 15 mins (Render's sleep timeout)
  setInterval(() => {
    const protocol = RENDER_EXTERNAL_URL.startsWith('https') ? https : http;
    protocol.get(`${RENDER_EXTERNAL_URL}/ping`, (res) => {
      console.log(`Self-ping status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`Self-ping error: ${err.message}`);
    });
  }, 14 * 60 * 1000); // 14 mins
}

app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
