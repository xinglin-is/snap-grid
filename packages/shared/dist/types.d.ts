export type Column = 0 | 1 | 2;
export type Row = 0 | 1 | 2 | 3;
export interface GridCoord {
    x: Column;
    y: Row;
}
export type EffectId = 'SHIELD' | 'PIERCING' | 'RALLY' | 'SMITE' | 'HEAL' | 'WATCHTOWER_AURA';
export type CardType = 'Unit' | 'Spell' | 'Structure';
export interface CardDefinition {
    id: string;
    name: string;
    type: CardType;
    cost: number;
    power: number;
    health: number;
    effectId?: EffectId;
    effectParams?: Record<string, number>;
    flavorText?: string;
}
export interface CardInstance {
    instanceId: string;
    definitionId: string;
    currentHealth: number;
    maxHealth: number;
    power: number;
    shieldCharges: number;
    position: GridCoord | null;
    ownerId: 0 | 1;
}
export interface NexusState {
    maxHealth: number;
    currentHealth: number;
    owner: 0 | 1;
    position: GridCoord;
}
export type BoardCells = [
    [
        CardInstance | null,
        CardInstance | null,
        CardInstance | null,
        CardInstance | null
    ],
    [
        CardInstance | null,
        CardInstance | null,
        CardInstance | null,
        CardInstance | null
    ],
    [
        CardInstance | null,
        CardInstance | null,
        CardInstance | null,
        CardInstance | null
    ]
];
export interface BoardState {
    cells: BoardCells;
    nexus: [NexusState, NexusState];
}
export interface PlayerState {
    slot: 0 | 1;
    hand: CardInstance[];
    deckCount: number;
    energy: number;
    maxEnergy: number;
    connected: boolean;
    reconnectToken: string;
    submittedReady: boolean;
}
export type PlanActionType = 'PLACE_CARD' | 'CAST_SPELL';
export interface PlaceCardAction {
    type: 'PLACE_CARD';
    instanceId: string;
    target: GridCoord;
}
export interface CastSpellAction {
    type: 'CAST_SPELL';
    instanceId: string;
    target: GridCoord;
}
export type PlanAction = PlaceCardAction | CastSpellAction;
export interface PlanSubmission {
    slot: 0 | 1;
    actions: PlanAction[];
    submittedAt: number;
}
export type CombatEventType = 'CLASH' | 'UNCONTESTED' | 'SPELL_DAMAGE' | 'SPELL_HEAL' | 'SPELL_BUFF' | 'CARD_DESTROYED' | 'NEXUS_DAMAGED' | 'SHIELD_ABSORB';
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
export interface ResolutionResult {
    turn: number;
    events: CombatEvent[];
    boardBefore: BoardState;
    boardAfter: BoardState;
    winner: 0 | 1 | 'draw' | null;
}
export type GameOverReason = 'NEXUS_DESTROYED' | 'BOTH_NEXUS_DESTROYED' | 'TURN_LIMIT' | 'FORFEIT' | 'DISCONNECT_TIMEOUT';
export interface GameOverResult {
    winner: 0 | 1 | 'draw';
    reason: GameOverReason;
    finalNexusHealth: [number, number];
}
export type GamePhase = 'LOBBY' | 'PLANNING' | 'RESOLUTION' | 'GAME_OVER';
export interface GameConfig {
    maxTurns: number;
    turnTimeoutMs: number;
    nexusStartingHealth: number;
    startingHandSize: number;
    maxHandSize: number;
    startingEnergy: number;
    maxEnergy: number;
}
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
export interface CreateRoomPayload {
}
export interface JoinRoomPayload {
    roomCode: string;
    reconnectToken?: string;
}
export interface SubmitReadyPayload {
    roomCode: string;
    plan: PlanSubmission;
}
export interface ForfeitPayload {
    roomCode: string;
}
export interface RoomCreatedPayload {
    roomCode: string;
    slot: 0;
    shareUrl: string;
}
export interface RoomJoinedPayload {
    roomCode: string;
    slot: 0 | 1;
    gameState: GameState;
}
export interface RoomFullPayload {
    roomCode: string;
}
export interface WaitingForOpponentPayload {
    slot: 0 | 1;
}
export interface OpponentReadyPayload {
}
export interface ResolutionPayload {
    resolution: ResolutionResult;
    newGameState: GameState;
}
export interface GameOverPayload {
    result: GameOverResult;
    finalGameState: GameState;
}
export interface ReconnectAckPayload {
    slot: 0 | 1;
    gameState: GameState;
}
export interface ErrorPayload {
    code: ErrorCode;
    message: string;
}
export type ErrorCode = 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'INVALID_MOVE' | 'NOT_YOUR_TURN' | 'ALREADY_SUBMITTED' | 'GAME_OVER' | 'INVALID_TARGET' | 'INSUFFICIENT_ENERGY' | 'INVALID_RECONNECT_TOKEN';
