"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEXUS_POSITION_PLAYER1 = exports.NEXUS_POSITION_PLAYER0 = exports.NEXUS_MAX_HEALTH = exports.STARTER_DECK = void 0;
// ─────────────────────────────────────────────────────────────────────────────
// SNAP-GRID STARTER DECK — 12 cards (same for both players)
// GD-01 Locked Spec v1.0
// ─────────────────────────────────────────────────────────────────────────────
exports.STARTER_DECK = [
    // ── UNITS (8) ──────────────────────────────────────────────────────────────
    {
        id: 'UNIT_GRUNT',
        name: 'Grunt',
        type: 'Unit',
        cost: 1,
        power: 2,
        health: 2,
        flavorText: 'First in, first out.',
    },
    {
        id: 'UNIT_WAR_HOUND',
        name: 'War Hound',
        type: 'Unit',
        cost: 1,
        power: 3,
        health: 1,
        flavorText: 'Fast, feral, fragile.',
    },
    {
        id: 'UNIT_SHIELD_BEARER',
        name: 'Shield Bearer',
        type: 'Unit',
        cost: 2,
        power: 1,
        health: 4,
        effectId: 'SHIELD',
        effectParams: { shieldCharges: 1 },
        flavorText: 'Takes the hit so your backline doesn\'t have to.',
    },
    {
        id: 'UNIT_RANGER',
        name: 'Ranger',
        type: 'Unit',
        cost: 2,
        power: 3,
        health: 2,
        flavorText: 'Picks the right column.',
    },
    {
        id: 'UNIT_KNIGHT',
        name: 'Knight',
        type: 'Unit',
        cost: 3,
        power: 3,
        health: 3,
        flavorText: 'Balanced. Reliable. Boring? You\'ll miss it when it\'s gone.',
    },
    {
        id: 'UNIT_BERSERKER',
        name: 'Berserker',
        type: 'Unit',
        cost: 3,
        power: 5,
        health: 2,
        flavorText: 'Hits first. Dies second. Usually.',
    },
    {
        id: 'UNIT_IRON_WALL',
        name: 'Iron Wall',
        type: 'Unit',
        cost: 3,
        power: 0,
        health: 6,
        effectId: 'SHIELD',
        effectParams: { shieldCharges: 2 },
        flavorText: 'Doesn\'t fight. Doesn\'t move. Doesn\'t die easily.',
    },
    {
        id: 'UNIT_IRON_GOLEM',
        name: 'Iron Golem',
        type: 'Unit',
        cost: 4,
        power: 4,
        health: 5,
        flavorText: 'Worth saving your energy for.',
    },
    // ── SPELLS (3) ─────────────────────────────────────────────────────────────
    {
        id: 'SPELL_RALLY',
        name: 'Rally',
        type: 'Spell',
        cost: 2,
        power: 0,
        health: 0,
        effectId: 'RALLY',
        effectParams: { powerBonus: 2 },
        flavorText: 'One unit, one moment, one push.',
    },
    {
        id: 'SPELL_SMITE',
        name: 'Smite',
        type: 'Spell',
        cost: 2,
        power: 0,
        health: 0,
        effectId: 'SMITE',
        effectParams: { damageAmount: 3 },
        flavorText: 'Removes problems cleanly.',
    },
    {
        id: 'SPELL_HEAL',
        name: 'Heal',
        type: 'Spell',
        cost: 1,
        power: 0,
        health: 0,
        effectId: 'HEAL',
        effectParams: { healAmount: 3 },
        flavorText: 'Buys one more turn.',
    },
    // ── STRUCTURES (1) ─────────────────────────────────────────────────────────
    {
        id: 'STRUCT_WATCHTOWER',
        name: 'Watchtower',
        type: 'Structure',
        cost: 2,
        power: 0,
        health: 4,
        effectId: 'WATCHTOWER_AURA',
        effectParams: { damageReduction: 1 },
        flavorText: 'While it stands, the backline breathes easier.',
    },
];
// Nexus is NOT a deck card — it's a special game object initialized by the server.
exports.NEXUS_MAX_HEALTH = 20;
exports.NEXUS_POSITION_PLAYER0 = { x: 1, y: 3 }; // Player 0 backline center
exports.NEXUS_POSITION_PLAYER1 = { x: 1, y: 0 }; // Player 1 backline center
