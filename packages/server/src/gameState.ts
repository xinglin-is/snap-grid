import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import type {
  GameState, PlayerState, BoardState, BoardCells, NexusState,
  CardInstance, CardDefinition, GameConfig,
} from '@snap-grid/shared';
import {
  STARTER_DECK, NEXUS_MAX_HEALTH,
  NEXUS_POSITION_PLAYER0, NEXUS_POSITION_PLAYER1,
  DEFAULT_CONFIG, energyForTurn,
} from '@snap-grid/shared';

// ─────────────────────────────────────────────────────────────────────────────
// ROOM CODE GENERATION
// ─────────────────────────────────────────────────────────────────────────────

// 32-char alphabet, 0/O and 1/I excluded to avoid visual ambiguity
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  const bytes = randomBytes(6);
  return Array.from(bytes)
    .map(b => ALPHABET[b % ALPHABET.length])
    .join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// DECK UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function shuffleDeck(definitions: CardDefinition[]): CardDefinition[] {
  const deck = [...definitions];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function makeCardInstance(def: CardDefinition, owner: 0 | 1): CardInstance {
  return {
    instanceId: uuidv4(),
    definitionId: def.id,
    currentHealth: def.health,
    maxHealth: def.health,
    power: def.power,
    shieldCharges: def.effectParams?.shieldCharges ?? 0,
    position: null,
    ownerId: owner,
  };
}

function dealHand(deck: CardDefinition[], owner: 0 | 1, count: number): {
  hand: CardInstance[];
  remaining: CardDefinition[];
} {
  const hand = deck.slice(0, count).map(d => makeCardInstance(d, owner));
  return { hand, remaining: deck.slice(count) };
}

// ─────────────────────────────────────────────────────────────────────────────
// BOARD INITIALISATION
// ─────────────────────────────────────────────────────────────────────────────

function emptyBoard(): BoardCells {
  return [
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ];
}

function makeNexus(owner: 0 | 1): NexusState {
  return {
    maxHealth: NEXUS_MAX_HEALTH,
    currentHealth: NEXUS_MAX_HEALTH,
    owner,
    position: owner === 0 ? NEXUS_POSITION_PLAYER0 : NEXUS_POSITION_PLAYER1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER STATE FACTORY
// ─────────────────────────────────────────────────────────────────────────────

interface ServerPlayerExtra {
  deck: CardDefinition[];       // Remaining deck (server-side only, not sent to client)
}

export interface ServerPlayerState extends PlayerState {
  _deck: CardDefinition[];
}

function makePlayer(slot: 0 | 1, config: GameConfig): ServerPlayerState {
  const shuffled = shuffleDeck(STARTER_DECK);
  const { hand, remaining } = dealHand(shuffled, slot, config.startingHandSize);
  return {
    slot,
    hand,
    deckCount: remaining.length,
    energy: energyForTurn(1, config),
    maxEnergy: energyForTurn(1, config),
    connected: false,
    reconnectToken: uuidv4(),
    submittedReady: false,
    _deck: remaining,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME STATE FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export interface ServerGameState extends Omit<GameState, 'players'> {
  players: [ServerPlayerState, ServerPlayerState];
}

export function createGameState(roomCode: string, config: GameConfig = DEFAULT_CONFIG): ServerGameState {
  const now = Date.now();
  const board: BoardState = {
    cells: emptyBoard(),
    nexus: [makeNexus(0), makeNexus(1)],
  };

  return {
    roomCode,
    phase: 'LOBBY',
    turn: 1,
    players: [makePlayer(0, config), makePlayer(1, config)],
    board,
    config,
    lastResolution: null,
    gameOver: null,
    createdAt: now,
    lastActivityAt: now,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT-SAFE GAME STATE (strips server-only fields)
// ─────────────────────────────────────────────────────────────────────────────

export function toClientState(state: ServerGameState, viewingSlot?: 0 | 1): GameState {
  const players = state.players.map((p, idx) => {
    const { _deck, ...clientPlayer } = p;
    // Hide opponent's hand contents if we know the viewer (show empty array)
    if (viewingSlot !== undefined && idx !== viewingSlot) {
      return {
        ...clientPlayer,
        hand: [],  // Opponent hand is hidden; handCount still available via deckCount
      };
    }
    return clientPlayer;
  }) as [PlayerState, PlayerState];

  return {
    ...state,
    players,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW CARD
// ─────────────────────────────────────────────────────────────────────────────

export function drawCard(state: ServerGameState, slot: 0 | 1): {
  drawn: CardInstance | null;
  burned: boolean;
} {
  const player = state.players[slot];
  if (player._deck.length === 0) return { drawn: null, burned: false };

  const [topDef, ...rest] = player._deck;
  player._deck = rest;
  player.deckCount = rest.length;

  const card = makeCardInstance(topDef, slot);

  if (player.hand.length >= state.config.maxHandSize) {
    // Overdraw — burn the card
    return { drawn: null, burned: true };
  }

  player.hand.push(card);
  return { drawn: card, burned: false };
}
