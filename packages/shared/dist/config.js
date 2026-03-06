"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.energyForTurn = energyForTurn;
exports.DEFAULT_CONFIG = {
    maxTurns: 20,
    turnTimeoutMs: 600000, // 10 minutes
    nexusStartingHealth: 20,
    startingHandSize: 3,
    maxHandSize: 7,
    startingEnergy: 1,
    maxEnergy: 6,
};
/**
 * Energy available on a given turn number (1-indexed).
 * Ramps 1→6, capped at maxEnergy from turn 6 onward.
 */
function energyForTurn(turn, config = exports.DEFAULT_CONFIG) {
    return Math.min(turn, config.maxEnergy);
}
