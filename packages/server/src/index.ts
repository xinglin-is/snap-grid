import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { registerHandlers } from './handlers';

const app = express();
const httpServer = createServer(app);

const isDev = process.env.NODE_ENV !== 'production';

const io = new Server(httpServer, {
  cors: isDev ? {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  } : undefined,
  transports: ['websocket', 'polling'],
});

// ── Health check (FIRST — before any static middleware that might fail) ───────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ── Static file serving ───────────────────────────────────────────────────────
// __dirname when compiled = packages/server/dist/server/src/
// In Docker, client dist is at /app/packages/client/dist
const clientDist = process.env.CLIENT_DIST
  ? path.resolve(process.env.CLIENT_DIST)
  : path.join(__dirname, '../../../../../packages/client/dist');

const indexHtml = path.join(clientDist, 'index.html');
const hasClientDist = fs.existsSync(indexHtml);

if (hasClientDist) {
  app.use(express.static(clientDist, { maxAge: '1d' }));
  app.get('*', (_req, res) => {
    res.sendFile(indexHtml);
  });
  console.log(`[static] serving client from ${clientDist}`);
} else {
  console.warn(`[static] client dist not found at ${clientDist} — API-only mode`);
  app.get('/', (_req, res) => {
    res.json({ game: 'snap-grid', status: 'running', note: 'client dist not found' });
  });
}

// ── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[ws] + ${socket.id}`);
  registerHandlers(io, socket);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3001);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🃏 Snap-Grid listening on :${PORT} [${process.env.NODE_ENV ?? 'development'}]`);
  console.log(`   clientDist: ${clientDist} (exists: ${hasClientDist})`);
});
