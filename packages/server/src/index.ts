import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { registerHandlers } from './handlers';

const app = express();
const httpServer = createServer(app);

// In production on Railway, the server is the origin — no separate client URL needed.
// Socket.io is served on the same origin, so CORS only needed for local dev.
const isDev = process.env.NODE_ENV !== 'production';
const DEV_CLIENT_URL = 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: isDev ? {
    origin: DEV_CLIENT_URL,
    methods: ['GET', 'POST'],
  } : undefined,           // same-origin in production — no CORS needed
  transports: ['websocket', 'polling'],
});

// ── Static file serving ───────────────────────────────────────────────────────
// Railway runs from repo root: server dist is at packages/server/dist/index.js
// Client build is at packages/client/dist/
const clientDist = process.env.CLIENT_DIST
  ? path.resolve(process.env.CLIENT_DIST)
  : path.join(__dirname, '../../client/dist');

app.use(express.static(clientDist, { maxAge: '1d' }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ── SPA fallback — all routes (including /room/:code) serve index.html ────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[ws] + ${socket.id}`);
  registerHandlers(io, socket);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3001);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🃏 Snap-Grid listening on :${PORT} [${process.env.NODE_ENV ?? 'development'}]`);
});
