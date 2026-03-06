import React from 'react';
import { useGameStore } from '../store/gameStore';
import { GridBoard } from './GridBoard';
import { HandArea } from './HandArea';

export function GameScreen() {
  const { gameState, slot, submitReady, forfeit, screen, opponentReady, error, clearError } = useGameStore();

  if (!gameState || slot === null) return null;

  const player = gameState.players[slot];
  const opponent = gameState.players[slot === 0 ? 1 : 0];
  const isSubmitted = screen === 'WAITING_FOR_OPPONENT';

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Status bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 16px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        {/* Opponent info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{
            fontSize: 10, color: 'var(--color-player1)',
            fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.05em',
          }}>
            OPPONENT {opponent.connected ? '' : '⚠ DC'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
            Hand: {opponent.hand.length > 0 ? opponent.hand.length : '?'} · Deck: {opponent.deckCount}
          </div>
        </div>

        {/* Turn indicator */}
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
          color: 'var(--color-frontline)',
          letterSpacing: '0.05em',
        }}>
          TURN {gameState.turn}
        </div>

        {/* Player info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
          <div style={{
            fontSize: 10, color: 'var(--color-player0)',
            fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.05em',
          }}>
            YOU (P{slot + 1})
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
            Hand: {player.hand.length} · Deck: {player.deckCount}
          </div>
        </div>
      </div>

      {/* Opponent ready indicator */}
      {opponentReady && !isSubmitted && (
        <div style={{
          background: 'var(--color-player1)22',
          borderBottom: '1px solid var(--color-player1)44',
          padding: '4px 16px',
          fontSize: 11, color: 'var(--color-player1)',
          textAlign: 'center', fontFamily: 'var(--font-display)',
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}>
          Opponent is ready! Submit when done.
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{
          background: '#2a0a0a', borderBottom: '1px solid #ef4444',
          padding: '6px 16px', fontSize: 11, color: '#ef4444',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          {error}
          <button onClick={clearError} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Grid board — scrollable middle */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <GridBoard board={gameState.board} slot={slot} />
      </div>

      {/* Hand area */}
      <HandArea
        hand={player.hand}
        energy={player.energy}
        maxEnergy={player.maxEnergy}
        submitted={isSubmitted}
      />

      {/* Action bar */}
      <div style={{
        padding: '10px 16px 16px',
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        flexShrink: 0,
        display: 'flex',
        gap: 10,
      }}>
        {isSubmitted ? (
          <div style={{
            flex: 1,
            background: 'var(--color-waiting)',
            borderRadius: 8, padding: '14px',
            textAlign: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
            color: '#fff', letterSpacing: '0.1em',
          }}>
            ⏳ WAITING FOR OPPONENT…
          </div>
        ) : (
          <>
            <button
              onClick={forfeit}
              style={{
                background: 'transparent',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-border-accent)',
                borderRadius: 8, padding: '12px 16px',
                fontSize: 12, fontFamily: 'var(--font-display)',
                cursor: 'pointer',
              }}
            >
              🏳 FF
            </button>
            <button
              onClick={submitReady}
              style={{
                flex: 1,
                background: 'var(--color-ready)',
                color: '#fff', border: 'none',
                borderRadius: 8, padding: '14px',
                fontSize: 16, fontWeight: 700,
                fontFamily: 'var(--font-display)',
                cursor: 'pointer',
                letterSpacing: '0.1em',
                boxShadow: '0 0 12px rgba(34, 197, 94, 0.3)',
                transition: 'background var(--anim-micro), box-shadow var(--anim-micro)',
              }}
            >
              ✓ READY
            </button>
          </>
        )}
      </div>
    </div>
  );
}
