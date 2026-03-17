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

export const SOCKET_EVENTS = {
  JOIN_ROOM: 'join-room',
  TEXT_UPDATE: 'text-update',
  USER_CONNECTED: 'user-connected',
  USER_DISCONNECTED: 'user-disconnected',
  ROOM_DATA: 'room-data',
  ERROR: 'error'
} as const;

export const MAX_TEXT_LENGTH = 10000;
