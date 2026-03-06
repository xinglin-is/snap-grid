import type { Server, Socket } from 'socket.io';
import type { PlanSubmission, GameOverResult } from '@snap-grid/shared';
import { energyForTurn } from '@snap-grid/shared';
import {
  createGameState, toClientState, drawCard, generateRoomCode,
  type ServerGameState,
} from './gameState';
import { resolveRound, checkWin } from './resolver';

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY ROOM STORE
// ─────────────────────────────────────────────────────────────────────────────

interface Room {
  code: string;
  state: ServerGameState;
  sockets: [string | null, string | null];        // socket IDs per slot
  pendingPlans: [PlanSubmission | null, PlanSubmission | null];
  planTimer: NodeJS.Timeout | null;
}

const rooms = new Map<string, Room>();

// Room expiry: clean up inactive rooms after 2 hours
const ROOM_EXPIRY_MS = 2 * 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.state.lastActivityAt > ROOM_EXPIRY_MS) {
      if (room.planTimer) clearTimeout(room.planTimer);
      rooms.delete(code);
    }
  }
}, 5 * 60 * 1000);

// Disconnect timeout: auto-forfeit after 2 minutes
const DISCONNECT_FORFEIT_MS = 120_000;
const disconnectTimers = new Map<string, NodeJS.Timeout>(); // socketId → timer

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function findRoomBySocket(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.sockets[0] === socketId || room.sockets[1] === socketId) return room;
  }
  return undefined;
}

function getSlotBySocket(room: Room, socketId: string): 0 | 1 | null {
  if (room.sockets[0] === socketId) return 0;
  if (room.sockets[1] === socketId) return 1;
  return null;
}

function broadcastToRoom(io: Server, room: Room, event: string, payload: unknown): void {
  for (const socketId of room.sockets) {
    if (socketId) io.to(socketId).emit(event, payload);
  }
}

function startNextTurn(io: Server, room: Room): void {
  const state = room.state;
  state.turn += 1;
  state.phase = 'PLANNING';
  room.pendingPlans = [null, null];

  // Reset submitted flags, refresh energy, draw cards
  for (const player of state.players) {
    player.submittedReady = false;
    player.energy = energyForTurn(state.turn, state.config);
    player.maxEnergy = energyForTurn(state.turn, state.config);
    drawCard(state, player.slot);
  }

  state.lastActivityAt = Date.now();

  // Broadcast new turn state to each player
  for (let slot = 0 as 0 | 1; slot <= 1; slot++) {
    const socketId = room.sockets[slot];
    if (socketId) {
      io.to(socketId).emit('TURN_START', {
        turn: state.turn,
        gameState: toClientState(state, slot as 0 | 1),
      });
    }
  }

  // Set planning timeout
  if (room.planTimer) clearTimeout(room.planTimer);
  room.planTimer = setTimeout(() => {
    // Auto-submit empty plan for any player who hasn't submitted
    for (let slot = 0 as 0 | 1; slot <= 1; slot++) {
      if (!room.pendingPlans[slot]) {
        room.pendingPlans[slot] = {
          slot,
          actions: [],
          submittedAt: Date.now(),
        };
      }
    }
    triggerResolution(io, room);
  }, state.config.turnTimeoutMs);
}

function triggerResolution(io: Server, room: Room): void {
  if (room.planTimer) { clearTimeout(room.planTimer); room.planTimer = null; }

  const state = room.state;
  state.phase = 'RESOLUTION';
  state.lastActivityAt = Date.now();

  const result = resolveRound(state, room.pendingPlans);
  state.lastResolution = result;

  if (result.winner !== null) {
    // Game over
    state.phase = 'GAME_OVER';
    const gameOverResult: GameOverResult = {
      winner: result.winner,
      reason: result.winner === 'draw' ? 'BOTH_NEXUS_DESTROYED' : 'NEXUS_DESTROYED',
      finalNexusHealth: [state.board.nexus[0].currentHealth, state.board.nexus[1].currentHealth],
    };
    state.gameOver = gameOverResult;

    broadcastToRoom(io, room, 'RESOLUTION_EVENT', {
      resolution: result,
      newGameState: toClientState(state),
    });
    broadcastToRoom(io, room, 'GAME_OVER', {
      result: gameOverResult,
      finalGameState: toClientState(state),
    });
  } else {
    // Broadcast resolution, then advance turn
    broadcastToRoom(io, room, 'RESOLUTION_EVENT', {
      resolution: result,
      newGameState: toClientState(state),
    });
    // Small delay so clients can animate before next turn starts
    setTimeout(() => startNextTurn(io, room), 4000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCKET HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

export function registerHandlers(io: Server, socket: Socket): void {

  // ── CREATE_ROOM ──────────────────────────────────────────────────────────
  socket.on('CREATE_ROOM', () => {
    let code: string;
    do { code = generateRoomCode(); } while (rooms.has(code));

    const state = createGameState(code);
    const room: Room = { code, state, sockets: [socket.id, null], pendingPlans: [null, null], planTimer: null };
    rooms.set(code, room);

    state.players[0].connected = true;

    socket.emit('ROOM_CREATED', {
      roomCode: code,
      slot: 0,
      shareUrl: `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/room/${code}`,
    });
  });

  // ── JOIN_ROOM ─────────────────────────────────────────────────────────────
  socket.on('JOIN_ROOM', ({ roomCode, reconnectToken }: { roomCode: string; reconnectToken?: string }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('ERROR', { code: 'ROOM_NOT_FOUND', message: `Room ${roomCode} not found.` });
      return;
    }

    const state = room.state;

    // Reconnect attempt
    if (reconnectToken) {
      for (let slot = 0 as 0 | 1; slot <= 1; slot++) {
        if (state.players[slot].reconnectToken === reconnectToken) {
          room.sockets[slot] = socket.id;
          state.players[slot].connected = true;

          // Cancel any pending disconnect forfeit
          const timer = disconnectTimers.get(socket.id);
          if (timer) { clearTimeout(timer); disconnectTimers.delete(socket.id); }

          socket.emit('RECONNECT_ACK', {
            slot,
            gameState: toClientState(state, slot),
          });
          return;
        }
      }
      socket.emit('ERROR', { code: 'INVALID_RECONNECT_TOKEN', message: 'Reconnect token invalid.' });
      return;
    }

    // Fresh join — need slot 1
    if (room.sockets[1] !== null) {
      socket.emit('ERROR', { code: 'ROOM_FULL', message: `Room ${roomCode} is full.` });
      return;
    }

    room.sockets[1] = socket.id;
    state.players[1].connected = true;
    state.phase = 'PLANNING';
    state.lastActivityAt = Date.now();

    // Send each player their state
    for (let slot = 0 as 0 | 1; slot <= 1; slot++) {
      const sid = room.sockets[slot];
      if (sid) {
        io.to(sid).emit('ROOM_JOINED', {
          roomCode,
          slot,
          gameState: toClientState(state, slot),
        });
      }
    }

    // Start planning timer
    if (room.planTimer) clearTimeout(room.planTimer);
    room.planTimer = setTimeout(() => {
      for (let slot = 0 as 0 | 1; slot <= 1; slot++) {
        if (!room.pendingPlans[slot]) {
          room.pendingPlans[slot] = { slot, actions: [], submittedAt: Date.now() };
        }
      }
      triggerResolution(io, room);
    }, state.config.turnTimeoutMs);
  });

  // ── SUBMIT_READY ──────────────────────────────────────────────────────────
  socket.on('SUBMIT_READY', ({ roomCode, plan }: { roomCode: string; plan: PlanSubmission }) => {
    const room = rooms.get(roomCode);
    if (!room) { socket.emit('ERROR', { code: 'ROOM_NOT_FOUND', message: 'Room not found.' }); return; }

    const slot = getSlotBySocket(room, socket.id);
    if (slot === null) { socket.emit('ERROR', { code: 'NOT_YOUR_TURN', message: 'Not in this room.' }); return; }

    if (room.state.phase !== 'PLANNING') {
      socket.emit('ERROR', { code: 'NOT_YOUR_TURN', message: 'Not in planning phase.' });
      return;
    }

    if (room.pendingPlans[slot]) {
      socket.emit('ERROR', { code: 'ALREADY_SUBMITTED', message: 'Already submitted.' });
      return;
    }

    room.state.players[slot].submittedReady = true;
    room.pendingPlans[slot] = { ...plan, slot };
    room.state.lastActivityAt = Date.now();

    // Notify this player they're waiting
    socket.emit('WAITING_FOR_OPPONENT', { slot });

    // Notify opponent that this player is ready
    const otherSlot: 0 | 1 = slot === 0 ? 1 : 0;
    const otherSocketId = room.sockets[otherSlot];
    if (otherSocketId) io.to(otherSocketId).emit('OPPONENT_READY', {});

    // If both submitted — trigger resolution
    if (room.pendingPlans[0] && room.pendingPlans[1]) {
      triggerResolution(io, room);
    }
  });

  // ── FORFEIT ───────────────────────────────────────────────────────────────
  socket.on('FORFEIT', ({ roomCode }: { roomCode: string }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const slot = getSlotBySocket(room, socket.id);
    if (slot === null) return;

    const winner = slot === 0 ? 1 : 0;
    const state = room.state;
    state.phase = 'GAME_OVER';
    const result: GameOverResult = {
      winner,
      reason: 'FORFEIT',
      finalNexusHealth: [state.board.nexus[0].currentHealth, state.board.nexus[1].currentHealth],
    };
    state.gameOver = result;
    broadcastToRoom(io, room, 'GAME_OVER', { result, finalGameState: toClientState(state) });
  });

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;

    const slot = getSlotBySocket(room, socket.id);
    if (slot === null) return;

    room.state.players[slot].connected = false;

    // Notify opponent
    const otherSlot: 0 | 1 = slot === 0 ? 1 : 0;
    const otherSocketId = room.sockets[otherSlot];
    if (otherSocketId) io.to(otherSocketId).emit('OPPONENT_DISCONNECTED', { slot });

    // Start forfeit countdown
    const timer = setTimeout(() => {
      const winner = otherSlot;
      const state = room.state;
      if (state.phase === 'GAME_OVER') return;
      state.phase = 'GAME_OVER';
      const result: GameOverResult = {
        winner,
        reason: 'DISCONNECT_TIMEOUT',
        finalNexusHealth: [state.board.nexus[0].currentHealth, state.board.nexus[1].currentHealth],
      };
      state.gameOver = result;
      broadcastToRoom(io, room, 'GAME_OVER', { result, finalGameState: toClientState(state) });
    }, DISCONNECT_FORFEIT_MS);

    disconnectTimers.set(socket.id, timer);
  });
}
