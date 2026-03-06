import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import type {
  GameState, CardInstance, PlanSubmission, PlanAction,
  ResolutionResult, GameOverResult,
} from '@snap-grid/shared';

// ─────────────────────────────────────────────────────────────────────────────
// STORE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type AppScreen = 'LOBBY' | 'WAITING_FOR_OPPONENT' | 'GAME' | 'RESOLVING' | 'GAME_OVER';

interface GameStore {
  // Connection
  socket: Socket | null;
  connected: boolean;

  // Room
  roomCode: string | null;
  slot: 0 | 1 | null;
  shareUrl: string | null;

  // Game
  screen: AppScreen;
  gameState: GameState | null;
  lastResolution: ResolutionResult | null;
  gameOverResult: GameOverResult | null;
  opponentReady: boolean;

  // Planning — local pending plan (not yet submitted)
  localPlan: PlanAction[];
  selectedHandCard: CardInstance | null;

  // Error
  error: string | null;

  // Actions
  connect: () => void;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  selectHandCard: (card: CardInstance | null) => void;
  placeCard: (x: number, y: number) => void;
  submitReady: () => void;
  forfeit: () => void;
  resetToLobby: () => void;
  clearError: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// RECONNECT TOKEN (persisted in sessionStorage)
// ─────────────────────────────────────────────────────────────────────────────

const RECONNECT_KEY = 'snap-grid-reconnect';

function getReconnectToken(): string | null {
  try { return sessionStorage.getItem(RECONNECT_KEY); } catch { return null; }
}

function setReconnectToken(token: string): void {
  try { sessionStorage.setItem(RECONNECT_KEY, token); } catch {}
}

function getRoomCodeFromUrl(): string | null {
  const match = window.location.pathname.match(/\/room\/([A-Z0-9]{6})/i);
  return match ? match[1].toUpperCase() : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ZUSTAND STORE
// ─────────────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  connected: false,
  roomCode: null,
  slot: null,
  shareUrl: null,
  screen: 'LOBBY',
  gameState: null,
  lastResolution: null,
  gameOverResult: null,
  opponentReady: false,
  localPlan: [],
  selectedHandCard: null,
  error: null,

  connect: () => {
    if (get().socket) return;

    const socket = io({ transports: ['websocket'] });

    socket.on('connect', () => {
      set({ connected: true });

      // Auto-join if URL has a room code
      const urlCode = getRoomCodeFromUrl();
      const reconnectToken = getReconnectToken();
      if (urlCode) {
        socket.emit('JOIN_ROOM', { roomCode: urlCode, reconnectToken });
      }
    });

    socket.on('disconnect', () => set({ connected: false }));

    socket.on('ROOM_CREATED', ({ roomCode, slot, shareUrl }: any) => {
      const gameState = get().gameState;
      if (gameState) setReconnectToken(gameState.players[slot].reconnectToken);
      // Push URL
      window.history.pushState({}, '', `/room/${roomCode}`);
      set({ roomCode, slot, shareUrl, screen: 'WAITING_FOR_OPPONENT', error: null });
    });

    socket.on('ROOM_JOINED', ({ roomCode, slot, gameState }: any) => {
      setReconnectToken(gameState.players[slot].reconnectToken);
      window.history.pushState({}, '', `/room/${roomCode}`);
      set({
        roomCode,
        slot,
        gameState,
        screen: 'GAME',
        opponentReady: false,
        localPlan: [],
        selectedHandCard: null,
        error: null,
      });
    });

    socket.on('RECONNECT_ACK', ({ slot, gameState }: any) => {
      set({ slot, gameState, screen: 'GAME', error: null });
    });

    socket.on('TURN_START', ({ gameState }: any) => {
      set({
        gameState,
        screen: 'GAME',
        opponentReady: false,
        localPlan: [],
        selectedHandCard: null,
      });
    });

    socket.on('WAITING_FOR_OPPONENT', () => {
      // Our submission was acknowledged
    });

    socket.on('OPPONENT_READY', () => {
      set({ opponentReady: true });
    });

    socket.on('RESOLUTION_EVENT', ({ resolution, newGameState }: any) => {
      set({
        lastResolution: resolution,
        gameState: newGameState,
        screen: 'RESOLVING',
      });
      // Auto-return to GAME after animation duration
      setTimeout(() => {
        if (get().screen === 'RESOLVING') {
          set({ screen: 'GAME' });
        }
      }, 3600);
    });

    socket.on('GAME_OVER', ({ result, finalGameState }: any) => {
      set({ gameOverResult: result, gameState: finalGameState, screen: 'GAME_OVER' });
    });

    socket.on('OPPONENT_DISCONNECTED', () => {
      set({ error: 'Opponent disconnected. Waiting for reconnect…' });
    });

    socket.on('ERROR', ({ code, message }: any) => {
      set({ error: `${code}: ${message}` });
    });

    set({ socket });
  },

  createRoom: () => {
    get().socket?.emit('CREATE_ROOM', {});
  },

  joinRoom: (code: string) => {
    get().socket?.emit('JOIN_ROOM', { roomCode: code.toUpperCase() });
  },

  selectHandCard: (card) => set({ selectedHandCard: card }),

  placeCard: (x, y) => {
    const { selectedHandCard, slot, localPlan } = get();
    if (!selectedHandCard || slot === null) return;

    // Validate: own territory
    const validRows = slot === 0 ? [2, 3] : [0, 1];
    if (!validRows.includes(y)) return;

    const action: PlanAction = {
      type: 'PLACE_CARD',
      instanceId: selectedHandCard.instanceId,
      target: { x: x as 0 | 1 | 2, y: y as 0 | 1 | 2 | 3 },
    };

    set({
      localPlan: [...localPlan, action],
      selectedHandCard: null,
    });
  },

  submitReady: () => {
    const { socket, roomCode, slot, localPlan } = get();
    if (!socket || !roomCode || slot === null) return;

    const plan: PlanSubmission = {
      slot,
      actions: localPlan,
      submittedAt: Date.now(),
    };

    socket.emit('SUBMIT_READY', { roomCode, plan });
    set({ screen: 'WAITING_FOR_OPPONENT' });
  },

  forfeit: () => {
    const { socket, roomCode } = get();
    if (socket && roomCode) socket.emit('FORFEIT', { roomCode });
  },

  resetToLobby: () => {
    window.history.pushState({}, '', '/');
    set({
      roomCode: null,
      slot: null,
      shareUrl: null,
      screen: 'LOBBY',
      gameState: null,
      lastResolution: null,
      gameOverResult: null,
      opponentReady: false,
      localPlan: [],
      selectedHandCard: null,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
