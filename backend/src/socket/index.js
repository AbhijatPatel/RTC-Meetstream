import { verifyToken } from "../utils/jwt.js";

// In-memory per-room state. Fine for a single server instance / demo.
// For multiple server instances you'd move this to Redis and use the
// socket.io Redis adapter so rooms are shared across processes.
const roomWhiteboards = new Map(); // roomId -> array of draw events

function getWhiteboardHistory(roomId) {
  if (!roomWhiteboards.has(roomId)) {
    roomWhiteboards.set(roomId, []);
  }
  return roomWhiteboards.get(roomId);
}

export function registerSignaling(io) {
  // Every socket must present a valid JWT (issued by /api/auth/login or
  // /api/auth/register) before it's allowed to do anything.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error("No token provided");
      socket.user = verifyToken(token);
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    let currentRoom = null;

    socket.on("join-room", (roomId) => {
      if (currentRoom) socket.leave(currentRoom);
      currentRoom = roomId;
      socket.join(roomId);

      const otherClients = [...(io.sockets.adapter.rooms.get(roomId) || [])].filter(
        (id) => id !== socket.id
      );

      // Tell the new participant who's already here, and send whiteboard
      // history so late joiners see what's already been drawn.
      socket.emit("room-joined", {
        peers: otherClients.map((id) => ({
          socketId: id,
          name: io.sockets.sockets.get(id)?.user?.name,
        })),
        whiteboardHistory: getWhiteboardHistory(roomId),
      });

      // Tell everyone already in the room that a new peer arrived, so they
      // can initiate the WebRTC offer to the newcomer.
      socket.to(roomId).emit("peer-joined", {
        socketId: socket.id,
        name: socket.user.name,
      });
    });

    // --- WebRTC signaling relay ---------------------------------------
    // The server never inspects these payloads, it just forwards SDP /
    // ICE data between the two peers named in the message.
    socket.on("webrtc-offer", ({ to, offer }) => {
      io.to(to).emit("webrtc-offer", { from: socket.id, offer });
    });

    socket.on("webrtc-answer", ({ to, answer }) => {
      io.to(to).emit("webrtc-answer", { from: socket.id, answer });
    });

    socket.on("webrtc-ice-candidate", ({ to, candidate }) => {
      io.to(to).emit("webrtc-ice-candidate", { from: socket.id, candidate });
    });

    // --- Whiteboard ------------------------------------------------------
    socket.on("whiteboard-draw", (event) => {
      if (!currentRoom) return;
      getWhiteboardHistory(currentRoom).push(event);
      socket.to(currentRoom).emit("whiteboard-draw", event);
    });

    socket.on("whiteboard-clear", () => {
      if (!currentRoom) return;
      roomWhiteboards.set(currentRoom, []);
      io.to(currentRoom).emit("whiteboard-clear");
    });

    // --- Chat + file sharing ---------------------------------------------
    socket.on("chat-message", (message) => {
      if (!currentRoom) return;
      io.to(currentRoom).emit("chat-message", {
        from: socket.user.name,
        text: message,
        at: Date.now(),
      });
    });

    socket.on("file-shared", (file) => {
      if (!currentRoom) return;
      io.to(currentRoom).emit("file-shared", {
        from: socket.user.name,
        ...file,
        at: Date.now(),
      });
    });

    socket.on("disconnect", () => {
      if (currentRoom) {
        socket.to(currentRoom).emit("peer-left", { socketId: socket.id });
      }
    });
  });
}
