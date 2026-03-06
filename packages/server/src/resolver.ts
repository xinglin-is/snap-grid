import type {
  BoardState, BoardCells, CardInstance, CombatEvent, ResolutionResult,
  PlanSubmission, PlaceCardAction, CastSpellAction, GameState, Column, GridCoord,
} from '@snap-grid/shared';
import type { ServerGameState, ServerPlayerState } from './gameState';
import { energyForTurn } from '@snap-grid/shared';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function cloneBoard(board: BoardState): BoardState {
  return JSON.parse(JSON.stringify(board));
}

function getCell(cells: BoardCells, x: number, y: number): CardInstance | null {
  return cells[x as Column]?.[y] ?? null;
}

function setCell(cells: BoardCells, x: number, y: number, card: CardInstance | null): void {
  cells[x as Column][y] = card;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 0–1: APPLY PLACEMENTS
// ─────────────────────────────────────────────────────────────────────────────

function applyPlacements(
  state: ServerGameState,
  board: BoardState,
  plans: [PlanSubmission | null, PlanSubmission | null],
  events: CombatEvent[],
): string[] {
  const errors: string[] = [];

  for (const plan of plans) {
    if (!plan) continue;
    const player = state.players[plan.slot];

    for (const action of plan.actions) {
      if (action.type !== 'PLACE_CARD') continue;
      const cardIdx = player.hand.findIndex(c => c.instanceId === action.instanceId);
      if (cardIdx === -1) { errors.push(`Card ${action.instanceId} not in hand`); continue; }

      const card = player.hand[cardIdx];
      const { x, y } = action.target;

      // Validate: player 0 owns rows 2–3, player 1 owns rows 0–1
      const validRows = plan.slot === 0 ? [2, 3] : [0, 1];
      if (!validRows.includes(y)) { errors.push(`Invalid placement row ${y} for slot ${plan.slot}`); continue; }

      // Validate: cell must be empty (or only Nexus which is a separate obj)
      if (getCell(board.cells, x, y)) { errors.push(`Cell (${x},${y}) occupied`); continue; }

      card.position = { x: x as Column, y: y as 0 | 1 | 2 | 3 };
      setCell(board.cells, x, y, card);
      player.hand.splice(cardIdx, 1);
    }
  }

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2–3: APPLY SPELL EFFECTS
// ─────────────────────────────────────────────────────────────────────────────

function applySpells(
  state: ServerGameState,
  board: BoardState,
  plans: [PlanSubmission | null, PlanSubmission | null],
  events: CombatEvent[],
): void {
  for (const plan of plans) {
    if (!plan) continue;
    const player = state.players[plan.slot];

    for (const action of plan.actions) {
      if (action.type !== 'CAST_SPELL') continue;
      const cardIdx = player.hand.findIndex(c => c.instanceId === action.instanceId);
      if (cardIdx === -1) continue;

      const spell = player.hand[cardIdx];
      const { x, y } = action.target;

      if (spell.definitionId === 'SPELL_RALLY') {
        // Buff friendly frontline unit in target column
        const frontlineY = plan.slot === 0 ? 2 : 1;
        const target = getCell(board.cells, x, frontlineY);
        if (target && target.ownerId === plan.slot) {
          const bonus = 2;
          target.power += bonus;
          events.push({
            type: 'SPELL_BUFF',
            column: x as Column,
            sourceInstanceId: spell.instanceId,
            targetInstanceId: target.instanceId,
            buffAmount: bonus,
            description: `Rally: ${target.definitionId} gains +${bonus} power this turn`,
          });
        }
      } else if (spell.definitionId === 'SPELL_SMITE') {
        // Deal 3 damage to enemy frontline unit in target column
        const enemyFrontY = plan.slot === 0 ? 1 : 2;
        const target = getCell(board.cells, x, enemyFrontY);
        if (target && target.ownerId !== plan.slot) {
          const dmg = 3;
          target.currentHealth -= dmg;
          events.push({
            type: 'SPELL_DAMAGE',
            column: x as Column,
            sourceInstanceId: spell.instanceId,
            targetInstanceId: target.instanceId,
            damage: dmg,
            description: `Smite: dealt ${dmg} damage to ${target.definitionId}`,
          });
        }
      } else if (spell.definitionId === 'SPELL_HEAL') {
        // Restore 3 health to friendly unit at target coord
        const target = getCell(board.cells, x, y);
        if (target && target.ownerId === plan.slot) {
          const heal = Math.min(3, target.maxHealth - target.currentHealth);
          target.currentHealth += heal;
          events.push({
            type: 'SPELL_HEAL',
            sourceInstanceId: spell.instanceId,
            targetInstanceId: target.instanceId,
            healAmount: heal,
            description: `Heal: restored ${heal} HP to ${target.definitionId}`,
          });
        }
      }

      // Consume spell from hand
      player.hand.splice(cardIdx, 1);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4–6: AUTO-COMBAT (SIMULTANEOUS, COLUMN-VS-COLUMN)
// ─────────────────────────────────────────────────────────────────────────────

function applyShieldAbsorb(card: CardInstance, incomingDamage: number, events: CombatEvent[]): number {
  if (card.shieldCharges > 0) {
    card.shieldCharges -= 1;
    events.push({
      type: 'SHIELD_ABSORB',
      targetInstanceId: card.instanceId,
      description: `Shield absorbed 1 damage on ${card.definitionId}`,
    });
    return Math.max(0, incomingDamage - 1);
  }
  return incomingDamage;
}

function getWatchtowerReduction(board: BoardState, x: number, backlineY: number, ownerId: 0 | 1): number {
  // Check if a Watchtower is in the same column's backline for this owner
  const cell = getCell(board.cells, x, backlineY);
  if (cell && cell.ownerId === ownerId && cell.definitionId === 'STRUCT_WATCHTOWER' && cell.currentHealth > 0) {
    return 1;
  }
  return 0;
}

export function resolveCombat(board: BoardState, events: CombatEvent[]): void {
  // Step 5: snapshot power values BEFORE combat (post-spell, post-placement)
  interface Snapshot {
    attackerPower: number;
    defenderPower: number;
    attacker: CardInstance | null;
    defender: CardInstance | null;
  }
  const snapshots: Snapshot[] = [];

  for (let x = 0; x < 3; x++) {
    const attacker = getCell(board.cells, x, 2); // Player 0 frontline
    const defender = getCell(board.cells, x, 1); // Player 1 frontline
    snapshots.push({
      attackerPower: attacker?.power ?? 0,
      defenderPower: defender?.power ?? 0,
      attacker,
      defender,
    });
  }

  // Step 6: Apply all damage simultaneously
  for (let x = 0; x < 3; x++) {
    const { attacker, defender, attackerPower, defenderPower } = snapshots[x];

    if (attacker && defender) {
      // Both frontlines present — CLASH
      let dmgToDefender = applyShieldAbsorb(defender, attackerPower, events);
      let dmgToAttacker = applyShieldAbsorb(attacker, defenderPower, events);

      // Watchtower aura doesn't apply to frontline in direct clash
      defender.currentHealth -= dmgToDefender;
      attacker.currentHealth -= dmgToAttacker;

      events.push({
        type: 'CLASH',
        column: x as Column,
        sourceInstanceId: attacker.instanceId,
        targetInstanceId: defender.instanceId,
        damage: dmgToDefender,
        description: `Col ${x}: ${attacker.definitionId} (${attackerPower}) vs ${defender.definitionId} (${defenderPower})`,
      });

      // PIERCING: if defender would die, carry excess damage to backline
      if (defender.currentHealth <= 0) {
        const excess = Math.abs(defender.currentHealth);
        if (excess > 0) {
          const backlineCard = getCell(board.cells, x, 0); // Player 1 backline
          const nexus = board.nexus[1];
          const watchtowerReduction = getWatchtowerReduction(board, x, 0, 1);

          if (backlineCard && backlineCard.ownerId === 1) {
            let excessDmg = Math.max(0, excess - watchtowerReduction);
            excessDmg = applyShieldAbsorb(backlineCard, excessDmg, events);
            backlineCard.currentHealth -= excessDmg;
            events.push({
              type: 'UNCONTESTED',
              column: x as Column,
              damage: excessDmg,
              description: `Piercing: ${excess} excess hits backline ${backlineCard.definitionId}`,
            });
          } else {
            const nexusDmg = Math.max(0, excess - watchtowerReduction);
            nexus.currentHealth -= nexusDmg;
            events.push({
              type: 'NEXUS_DAMAGED',
              column: x as Column,
              damage: nexusDmg,
              description: `Piercing: ${nexusDmg} excess hits Player 1 Nexus`,
            });
          }
        }
      }

    } else if (attacker && !defender) {
      // Player 0 frontline uncontested — hits player 1 backline or Nexus
      const backlineCard = getCell(board.cells, x, 0);
      const nexus = board.nexus[1];
      const watchtowerReduction = getWatchtowerReduction(board, x, 0, 1);

      if (backlineCard && backlineCard.ownerId === 1) {
        let dmg = Math.max(0, attackerPower - watchtowerReduction);
        dmg = applyShieldAbsorb(backlineCard, dmg, events);
        backlineCard.currentHealth -= dmg;
        events.push({
          type: 'UNCONTESTED',
          column: x as Column,
          sourceInstanceId: attacker.instanceId,
          targetInstanceId: backlineCard.instanceId,
          damage: dmg,
          description: `Col ${x}: Uncontested — ${attacker.definitionId} hits backline ${backlineCard.definitionId}`,
        });
      } else {
        const dmg = Math.max(0, attackerPower - watchtowerReduction);
        nexus.currentHealth -= dmg;
        events.push({
          type: 'NEXUS_DAMAGED',
          column: x as Column,
          sourceInstanceId: attacker.instanceId,
          damage: dmg,
          description: `Col ${x}: Uncontested — ${attacker.definitionId} hits Player 1 Nexus for ${dmg}`,
        });
      }

    } else if (!attacker && defender) {
      // Player 1 frontline uncontested — hits player 0 backline or Nexus
      const backlineCard = getCell(board.cells, x, 3);
      const nexus = board.nexus[0];
      const watchtowerReduction = getWatchtowerReduction(board, x, 3, 0);

      if (backlineCard && backlineCard.ownerId === 0) {
        let dmg = Math.max(0, defenderPower - watchtowerReduction);
        dmg = applyShieldAbsorb(backlineCard, dmg, events);
        backlineCard.currentHealth -= dmg;
        events.push({
          type: 'UNCONTESTED',
          column: x as Column,
          sourceInstanceId: defender.instanceId,
          targetInstanceId: backlineCard.instanceId,
          damage: dmg,
          description: `Col ${x}: Uncontested — ${defender.definitionId} hits backline ${backlineCard.definitionId}`,
        });
      } else {
        const dmg = Math.max(0, defenderPower - watchtowerReduction);
        nexus.currentHealth -= dmg;
        events.push({
          type: 'NEXUS_DAMAGED',
          column: x as Column,
          sourceInstanceId: defender.instanceId,
          damage: dmg,
          description: `Col ${x}: Uncontested — ${defender.definitionId} hits Player 0 Nexus for ${dmg}`,
        });
      }
    }
    // Both null — nothing happens in this column
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7: REMOVE DESTROYED CARDS
// ─────────────────────────────────────────────────────────────────────────────

function removeDestroyed(board: BoardState, events: CombatEvent[]): void {
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 4; y++) {
      const card = getCell(board.cells, x, y);
      if (card && card.currentHealth <= 0) {
        events.push({
          type: 'CARD_DESTROYED',
          targetInstanceId: card.instanceId,
          targetCoord: { x: x as Column, y: y as 0 | 1 | 2 | 3 },
          description: `${card.definitionId} destroyed at (${x},${y})`,
        });
        setCell(board.cells, x, y, null);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 8: CHECK WIN
// ─────────────────────────────────────────────────────────────────────────────

export function checkWin(
  board: BoardState,
  turn: number,
  maxTurns: number,
): { winner: 0 | 1 | 'draw' | null; reason?: string } {
  const p0NexusDead = board.nexus[0].currentHealth <= 0;
  const p1NexusDead = board.nexus[1].currentHealth <= 0;

  if (p0NexusDead && p1NexusDead) return { winner: 'draw', reason: 'BOTH_NEXUS_DESTROYED' };
  if (p1NexusDead) return { winner: 0, reason: 'NEXUS_DESTROYED' };
  if (p0NexusDead) return { winner: 1, reason: 'NEXUS_DESTROYED' };

  if (turn >= maxTurns) {
    const hp0 = board.nexus[0].currentHealth;
    const hp1 = board.nexus[1].currentHealth;
    if (hp0 > hp1) return { winner: 0, reason: 'TURN_LIMIT' };
    if (hp1 > hp0) return { winner: 1, reason: 'TURN_LIMIT' };
    return { winner: 'draw', reason: 'TURN_LIMIT' };
  }

  return { winner: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL RESOLUTION PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

export function resolveRound(
  state: ServerGameState,
  plans: [PlanSubmission | null, PlanSubmission | null],
): ResolutionResult {
  const boardBefore = cloneBoard(state.board);
  const events: CombatEvent[] = [];

  // Validate energy for each plan
  for (const plan of plans) {
    if (!plan) continue;
    const player = state.players[plan.slot];
    let totalCost = 0;
    for (const action of plan.actions) {
      const cardIdx = player.hand.findIndex(c => c.instanceId === action.instanceId);
      if (cardIdx !== -1) {
        // We'd need card def cost here — skipping full validation for now
        // TODO: import STARTER_DECK and check cost in production
      }
    }
  }

  // Step 1: Apply placements
  applyPlacements(state, state.board, plans, events);

  // Step 2–3: Apply spells (RALLY, HEAL, SMITE)
  applySpells(state, state.board, plans, events);

  // Step 4: Shield charges already encoded in CardInstance.shieldCharges

  // Step 5–6: Auto-combat (simultaneous)
  resolveCombat(state.board, events);

  // Step 7: Remove destroyed cards
  removeDestroyed(state.board, events);

  // Step 8: Check win
  const { winner } = checkWin(state.board, state.turn, state.config.maxTurns);

  const boardAfter = cloneBoard(state.board);

  return {
    turn: state.turn,
    events,
    boardBefore,
    boardAfter,
    winner,
  };
}
