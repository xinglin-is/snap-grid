import type { GameConfig } from './types';
export declare const DEFAULT_CONFIG: GameConfig;
/**
 * Energy available on a given turn number (1-indexed).
 * Ramps 1→6, capped at maxEnergy from turn 6 onward.
 */
export declare function energyForTurn(turn: number, config?: GameConfig): number;
