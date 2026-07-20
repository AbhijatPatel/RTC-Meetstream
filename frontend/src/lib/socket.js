import { io } from "socket.io-client";
import { API_BASE } from "./api.js";

let socket = null;

export function connectSocket(token) {
  if (socket) socket.disconnect();
  socket = io(API_BASE, {
    auth: { token },
    autoConnect: true,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
