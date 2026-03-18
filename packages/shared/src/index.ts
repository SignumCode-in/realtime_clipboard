export interface RoomData {
  text: string;
  users: number;
}

export interface JoinRoomPayload {
  roomId: string;
}

export interface TextUpdatePayload {
  roomId: string;
  text: string;
}

export interface FileMetadata {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  downloadUrl: string;
}

export const SOCKET_EVENTS = {
  JOIN_ROOM: 'join-room',
  TEXT_UPDATE: 'text-update',
  USER_CONNECTED: 'user-connected',
  USER_DISCONNECTED: 'user-disconnected',
  ROOM_DATA: 'room-data',
  ERROR: 'error',
  FILE_AVAILABLE: 'file-available'
} as const;

export const MAX_TEXT_LENGTH = 10000;
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/json',
  'application/zip',
  'application/x-zip-compressed'
];
