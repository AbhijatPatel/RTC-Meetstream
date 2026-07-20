import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

import authRoutes from "./src/routes/auth.js";
import uploadRoutes from "./src/routes/upload.js";
import { registerSignaling } from "./src/socket/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// Uploaded files (screenshots, shared docs, etc.) served statically.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN },
});

registerSignaling(io);

httpServer.listen(PORT, () => {
  console.log(`Signaling + API server listening on http://localhost:${PORT}`);
});
