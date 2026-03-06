// ─────────────────────────────────────────────────────────────────────────────
// SNAP-GRID SHARED TYPES
// Source of truth for both server and client
// ─────────────────────────────────────────────────────────────────────────────

// ── Coordinates ──────────────────────────────────────────────────────────────

export type Column = 0 | 1 | 2;
export type Row = 0 | 1 | 2 | 3;

export interface GridCoord {
  x: Column;
  y: Row;
}

// ── Effects ───────────────────────────────────────────────────────────────────

export type EffectId =
  | 'SHIELD'          // Absorbs N damage the first N hits
  | 'PIERCING'        // Excess damage carries to backline/Nexus
  | 'RALLY'           // Spell: give target friendly unit +2 power this resolution
  | 'SMITE'           // Spell: deal 3 damage to target enemy frontline unit
  | 'HEAL'            // Spell: restore 3 health to target friendly unit
  | 'WATCHTOWER_AURA';// Structure: reduce damage to same-column backline cards by 1

// ── Card Definition (static, from cards.json) ────────────────────────────────

export type CardType = 'Unit' | 'Spell' | 'Structure';

export interface CardDefinition {
  id: string;                    // e.g. "UNIT_GRUNT"
  name: string;
  type: CardType;
  cost: number;                  // Energy cost (1–4); 0 only for special objects
  power: number;                 // Attack value; 0 for Spells
  health: number;                // Max HP; 0 for Spells
  effectId?: EffectId;
  effectParams?: Record<string, number>; // e.g. { shieldCharges: 1, damageAmount: 3 }
  flavorText?: string;
}

// ── Card Instance (runtime, on the board or in hand) ─────────────────────────

export interface CardInstance {
  instanceId: string;            // UUID — unique per placed card
  definitionId: string;          // References CardDefinition.id
  currentHealth: number;
  maxHealth: number;
  power: number;                 // May differ from definition if Rally'd
  shieldCharges: number;         // Remaining SHIELD absorb charges (0 = no shield)
  position: GridCoord | null;    // null = in hand
  ownerId: 0 | 1;                // Which player owns this card
}

// ── Nexus (special game object, not a deck card) ─────────────────────────────

export interface NexusState {
  maxHealth: number;             // 20
  currentHealth: number;
  owner: 0 | 1;
  position: GridCoord;           // (x=1, y=0) for player1; (x=1, y=3) for player0
}

// ── Board ─────────────────────────────────────────────────────────────────────

// cells[x][y] — x ∈ {0,1,2}, y ∈ {0,1,2,3}
export type BoardCells = [
  [CardInstance | null, CardInstance | null, CardInstance | null, CardInstance | null],
  [CardInstance | null, CardInstance | null, CardInstance | null, CardInstance | null],
  [CardInstance | null, CardInstance | null, CardInstance | null, CardInstance | null],
];

export interface BoardState {
  cells: BoardCells;
  nexus: [NexusState, NexusState];  // [player0Nexus, player1Nexus]
}

// ── Player State ──────────────────────────────────────────────────────────────

export interface PlayerState {
  slot: 0 | 1;
  hand: CardInstance[];          // Cards in hand (max 7)
  deckCount: number;             // Cards remaining in deck (not revealed)
  energy: number;                // Current available energy
  maxEnergy: number;             // This turn's energy cap
  connected: boolean;
  reconnectToken: string;        // UUID4 stored in sessionStorage for reconnect
  submittedReady: boolean;
}

// ── Plan Submission ───────────────────────────────────────────────────────────

export type PlanActionType = 'PLACE_CARD' | 'CAST_SPELL';

export interface PlaceCardAction {
  type: 'PLACE_CARD';
  instanceId: string;            // Card from hand to place
  target: GridCoord;             // Where to place it (must be own territory)
}

export interface CastSpellAction {
  type: 'CAST_SPELL';
  instanceId: string;            // Spell card from hand
  target: GridCoord;             // Target cell
}

export type PlanAction = PlaceCardAction | CastSpellAction;

export interface PlanSubmission {
  slot: 0 | 1;
  actions: PlanAction[];
  submittedAt: number;           // Unix timestamp ms
}

// ── Combat Events (for animation) ─────────────────────────────────────────────

export type CombatEventType =
  | 'CLASH'            // Two frontline cards fight
  | 'UNCONTESTED'      // One frontline card hits backline/Nexus
  | 'SPELL_DAMAGE'     // Smite
  | 'SPELL_HEAL'       // Heal
  | 'SPELL_BUFF'       // Rally
  | 'CARD_DESTROYED'   // Card health reached 0
  | 'NEXUS_DAMAGED'    // Nexus took damage
  | 'SHIELD_ABSORB';   // Shield blocked damage

export interface CombatEvent {
  type: CombatEventType;
  column?: Column;
  sourceInstanceId?: string;
  targetInstanceId?: string;
  targetCoord?: GridCoord;
  damage?: number;
  healAmount?: number;
  buffAmount?: number;
  description: string;
}

// ── Resolution Result ─────────────────────────────────────────────────────────

export interface ResolutionResult {
  turn: number;
  events: CombatEvent[];
  boardBefore: BoardState;
  boardAfter: BoardState;
  winner: 0 | 1 | 'draw' | null;  // null = game continues
}

// ── Game Over ─────────────────────────────────────────────────────────────────

export type GameOverReason =
  | 'NEXUS_DESTROYED'
  | 'BOTH_NEXUS_DESTROYED'
  | 'TURN_LIMIT'
  | 'FORFEIT'
  | 'DISCONNECT_TIMEOUT';

export interface GameOverResult {
  winner: 0 | 1 | 'draw';
  reason: GameOverReason;
  finalNexusHealth: [number, number];  // [player0, player1]
}

// ── Game Phase ────────────────────────────────────────────────────────────────

export type GamePhase = 'LOBBY' | 'PLANNING' | 'RESOLUTION' | 'GAME_OVER';

// ── Game Config ───────────────────────────────────────────────────────────────

export interface GameConfig {
  maxTurns: number;             // 20 — turn limit for draw condition
  turnTimeoutMs: number;        // 600000 = 10 minutes
  nexusStartingHealth: number;  // 20
  startingHandSize: number;     // 3
  maxHandSize: number;          // 7
  startingEnergy: number;       // 1 on turn 1
  maxEnergy: number;            // 6 (capped from turn 6+)
}

// ── Full Game State ───────────────────────────────────────────────────────────

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  turn: number;
  players: [PlayerState, PlayerState];
  board: BoardState;
  config: GameConfig;
  lastResolution: ResolutionResult | null;
  gameOver: GameOverResult | null;
  createdAt: number;
  lastActivityAt: number;
}

// ── WebSocket Events ──────────────────────────────────────────────────────────
// Client → Server

export interface CreateRoomPayload {}
export interface JoinRoomPayload { roomCode: string; reconnectToken?: string; }
export interface SubmitReadyPayload { roomCode: string; plan: PlanSubmission; }
export interface ForfeitPayload { roomCode: string; }

// Server → Client

export interface RoomCreatedPayload { roomCode: string; slot: 0; shareUrl: string; }
export interface RoomJoinedPayload  { roomCode: string; slot: 0 | 1; gameState: GameState; }
export interface RoomFullPayload    { roomCode: string; }
export interface WaitingForOpponentPayload { slot: 0 | 1; }
export interface OpponentReadyPayload {}
export interface ResolutionPayload  { resolution: ResolutionResult; newGameState: GameState; }
export interface GameOverPayload    { result: GameOverResult; finalGameState: GameState; }
export interface ReconnectAckPayload { slot: 0 | 1; gameState: GameState; }

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
}

export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'INVALID_MOVE'
  | 'NOT_YOUR_TURN'
  | 'ALREADY_SUBMITTED'
  | 'GAME_OVER'
  | 'INVALID_TARGET'
  | 'INSUFFICIENT_ENERGY'
  | 'INVALID_RECONNECT_TOKEN';
