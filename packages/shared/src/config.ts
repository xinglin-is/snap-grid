import type { GameConfig } from './types';

export const DEFAULT_CONFIG: GameConfig = {
  maxTurns: 20,
  turnTimeoutMs: 600_000,       // 10 minutes
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
export function energyForTurn(turn: number, config: GameConfig = DEFAULT_CONFIG): number {
  return Math.min(turn, config.maxEnergy);
}
