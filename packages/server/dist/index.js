"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const handlers_1 = require("./handlers");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// In production on Railway, the server is the origin — no separate client URL needed.
// Socket.io is served on the same origin, so CORS only needed for local dev.
const isDev = process.env.NODE_ENV !== 'production';
const DEV_CLIENT_URL = 'http://localhost:5173';
const io = new socket_io_1.Server(httpServer, {
    cors: isDev ? {
        origin: DEV_CLIENT_URL,
        methods: ['GET', 'POST'],
    } : undefined, // same-origin in production — no CORS needed
    transports: ['websocket', 'polling'],
});
// ── Static file serving ───────────────────────────────────────────────────────
// Railway runs from repo root: server dist is at packages/server/dist/index.js
// Client build is at packages/client/dist/
const clientDist = process.env.CLIENT_DIST
    ? path_1.default.resolve(process.env.CLIENT_DIST)
    : path_1.default.join(__dirname, '../../client/dist');
app.use(express_1.default.static(clientDist, { maxAge: '1d' }));
// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});
// ── SPA fallback — all routes (including /room/:code) serve index.html ────────
app.get('*', (_req, res) => {
    res.sendFile(path_1.default.join(clientDist, 'index.html'));
});
// ── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[ws] + ${socket.id}`);
    (0, handlers_1.registerHandlers)(io, socket);
});
// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3001);
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🃏 Snap-Grid listening on :${PORT} [${process.env.NODE_ENV ?? 'development'}]`);
});
