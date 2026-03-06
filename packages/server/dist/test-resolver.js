// Quick smoke test for the resolver logic
// Run: node test-resolver.js from packages/server/dist

const { resolveCombat, checkWin } = require('./resolver');

function makeCard(id, power, health, owner, shieldCharges = 0) {
  return {
    instanceId: `${id}-${Math.random().toString(36).slice(2,6)}`,
    definitionId: id,
    currentHealth: health,
    maxHealth: health,
    power,
    shieldCharges,
    position: null,
    ownerId: owner,
  };
}

function emptyBoard() {
  return {
    cells: [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ],
    nexus: [
      { maxHealth: 20, currentHealth: 20, owner: 0, position: { x: 1, y: 3 } },
      { maxHealth: 20, currentHealth: 20, owner: 1, position: { x: 1, y: 0 } },
    ],
  };
}

let passed = 0;
let failed = 0;

function assert(label, condition, details = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${details ? ' — ' + details : ''}`);
    failed++;
  }
}

// ── TEST 1: Basic clash ──────────────────────────────────────────────────────
console.log('\nTest 1: Basic frontline clash (Grunt 2/2 vs Grunt 2/2)');
{
  const board = emptyBoard();
  const grunt0 = makeCard('UNIT_GRUNT', 2, 2, 0);
  const grunt1 = makeCard('UNIT_GRUNT', 2, 2, 1);
  board.cells[0][2] = grunt0; // player 0 frontline
  board.cells[0][1] = grunt1; // player 1 frontline

  const events = [];
  resolveCombat(board, events);

  assert('Grunt0 health reduced to 0', grunt0.currentHealth === 0, `got ${grunt0.currentHealth}`);
  assert('Grunt1 health reduced to 0', grunt1.currentHealth === 0, `got ${grunt1.currentHealth}`);
  assert('CLASH event emitted', events.some(e => e.type === 'CLASH'));
  assert('Nexus untouched', board.nexus[0].currentHealth === 20 && board.nexus[1].currentHealth === 20);
}

// ── TEST 2: Uncontested column hits Nexus ───────────────────────────────────
console.log('\nTest 2: Uncontested column — hits opponent Nexus directly');
{
  const board = emptyBoard();
  const berserker = makeCard('UNIT_BERSERKER', 5, 2, 0);
  board.cells[1][2] = berserker; // player 0 frontline col 1, no opponent

  const events = [];
  resolveCombat(board, events);

  assert('Player 1 Nexus took 5 damage', board.nexus[1].currentHealth === 15, `got ${board.nexus[1].currentHealth}`);
  assert('NEXUS_DAMAGED event emitted', events.some(e => e.type === 'NEXUS_DAMAGED'));
  assert('Player 0 Nexus untouched', board.nexus[0].currentHealth === 20);
}

// ── TEST 3: Shield absorbs 1 damage ─────────────────────────────────────────
console.log('\nTest 3: Shield absorbs 1 damage');
{
  const board = emptyBoard();
  const shieldBearer = makeCard('UNIT_SHIELD_BEARER', 1, 4, 1, 1); // 1 shield charge
  const grunt = makeCard('UNIT_GRUNT', 2, 2, 0);
  board.cells[0][2] = grunt;
  board.cells[0][1] = shieldBearer;

  const events = [];
  resolveCombat(board, events);

  // Grunt(2 power) hits ShieldBearer — shield absorbs 1 → ShieldBearer takes 1 dmg (4-1=3hp)
  assert('Shield absorbed 1 damage', shieldBearer.currentHealth === 3, `got ${shieldBearer.currentHealth}`);
  assert('Shield charge consumed', shieldBearer.shieldCharges === 0);
  assert('SHIELD_ABSORB event emitted', events.some(e => e.type === 'SHIELD_ABSORB'));
  // Grunt(2hp) takes 1 power from ShieldBearer → 1hp left
  assert('Grunt took 1 damage', grunt.currentHealth === 1, `got ${grunt.currentHealth}`);
}

// ── TEST 4: Win condition — Nexus at 0 ──────────────────────────────────────
console.log('\nTest 4: Win condition detection');
{
  const board = emptyBoard();
  board.nexus[1].currentHealth = 0;
  const result = checkWin(board, 5, 20);
  assert('Player 0 wins when P1 Nexus at 0', result.winner === 0, `got ${result.winner}`);
}

// ── TEST 5: Draw — both Nexus at 0 ──────────────────────────────────────────
console.log('\nTest 5: Draw — both Nexus destroyed simultaneously');
{
  const board = emptyBoard();
  board.nexus[0].currentHealth = 0;
  board.nexus[1].currentHealth = 0;
  const result = checkWin(board, 5, 20);
  assert('Draw when both Nexus at 0', result.winner === 'draw', `got ${result.winner}`);
}

// ── TEST 6: Turn limit tiebreak ─────────────────────────────────────────────
console.log('\nTest 6: Turn limit — higher Nexus HP wins');
{
  const board = emptyBoard();
  board.nexus[0].currentHealth = 15;
  board.nexus[1].currentHealth = 8;
  const result = checkWin(board, 20, 20); // turn 20 = max
  assert('Player 0 wins on turn limit with more HP', result.winner === 0, `got ${result.winner}`);
}

// ── TEST 7: Simultaneous combat (snapshot) ───────────────────────────────────
console.log('\nTest 7: Simultaneous damage — snapshot prevents sequential bias');
{
  const board = emptyBoard();
  // Berserker(5/2) vs Knight(3/3) — Berserker kills Knight but also dies
  const berserker = makeCard('UNIT_BERSERKER', 5, 2, 0);
  const knight = makeCard('UNIT_KNIGHT', 3, 3, 1);
  board.cells[2][2] = berserker;
  board.cells[2][1] = knight;

  const events = [];
  resolveCombat(board, events);

  // Both take damage simultaneously from snapshots:
  // berserker: 2hp - 3(knight power) = -1 → dead
  // knight: 3hp - 5(berserker power) = -2 → dead
  assert('Berserker dies (2hp - 3dmg)', berserker.currentHealth === -1, `got ${berserker.currentHealth}`);
  assert('Knight dies (3hp - 5dmg)', knight.currentHealth === -2, `got ${knight.currentHealth}`);
  // Berserker (5 power) kills Knight (3hp), 2 excess damage pierces to P1 Nexus
  assert('P1 Nexus takes 2 excess (piercing)', board.nexus[1].currentHealth === 18, `got ${board.nexus[1].currentHealth}`);
  assert('P0 Nexus untouched', board.nexus[0].currentHealth === 20);
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) console.log('🎉 All tests passed!');
else process.exit(1);
