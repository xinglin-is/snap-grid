"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoomCode = generateRoomCode;
exports.createGameState = createGameState;
exports.toClientState = toClientState;
exports.drawCard = drawCard;
const uuid_1 = require("uuid");
const crypto_1 = require("crypto");
const shared_1 = require("@snap-grid/shared");
// ─────────────────────────────────────────────────────────────────────────────
// ROOM CODE GENERATION
// ─────────────────────────────────────────────────────────────────────────────
// 32-char alphabet, 0/O and 1/I excluded to avoid visual ambiguity
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateRoomCode() {
    const bytes = (0, crypto_1.randomBytes)(6);
    return Array.from(bytes)
        .map(b => ALPHABET[b % ALPHABET.length])
        .join('');
}
// ─────────────────────────────────────────────────────────────────────────────
// DECK UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function shuffleDeck(definitions) {
    const deck = [...definitions];
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}
function makeCardInstance(def, owner) {
    return {
        instanceId: (0, uuid_1.v4)(),
        definitionId: def.id,
        currentHealth: def.health,
        maxHealth: def.health,
        power: def.power,
        shieldCharges: def.effectParams?.shieldCharges ?? 0,
        position: null,
        ownerId: owner,
    };
}
function dealHand(deck, owner, count) {
    const hand = deck.slice(0, count).map(d => makeCardInstance(d, owner));
    return { hand, remaining: deck.slice(count) };
}
// ─────────────────────────────────────────────────────────────────────────────
// BOARD INITIALISATION
// ─────────────────────────────────────────────────────────────────────────────
function emptyBoard() {
    return [
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
    ];
}
function makeNexus(owner) {
    return {
        maxHealth: shared_1.NEXUS_MAX_HEALTH,
        currentHealth: shared_1.NEXUS_MAX_HEALTH,
        owner,
        position: owner === 0 ? shared_1.NEXUS_POSITION_PLAYER0 : shared_1.NEXUS_POSITION_PLAYER1,
    };
}
function makePlayer(slot, config) {
    const shuffled = shuffleDeck(shared_1.STARTER_DECK);
    const { hand, remaining } = dealHand(shuffled, slot, config.startingHandSize);
    return {
        slot,
        hand,
        deckCount: remaining.length,
        energy: (0, shared_1.energyForTurn)(1, config),
        maxEnergy: (0, shared_1.energyForTurn)(1, config),
        connected: false,
        reconnectToken: (0, uuid_1.v4)(),
        submittedReady: false,
        _deck: remaining,
    };
}
function createGameState(roomCode, config = shared_1.DEFAULT_CONFIG) {
    const now = Date.now();
    const board = {
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
function toClientState(state, viewingSlot) {
    const players = state.players.map((p, idx) => {
        const { _deck, ...clientPlayer } = p;
        // Hide opponent's hand contents if we know the viewer (show empty array)
        if (viewingSlot !== undefined && idx !== viewingSlot) {
            return {
                ...clientPlayer,
                hand: [], // Opponent hand is hidden; handCount still available via deckCount
            };
        }
        return clientPlayer;
    });
    return {
        ...state,
        players,
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// DRAW CARD
// ─────────────────────────────────────────────────────────────────────────────
function drawCard(state, slot) {
    const player = state.players[slot];
    if (player._deck.length === 0)
        return { drawn: null, burned: false };
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
