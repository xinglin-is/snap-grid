import React from 'react';
import { useGameStore } from '../store/gameStore';

export function GameOverScreen() {
  const { gameOverResult, gameState, slot, resetToLobby, roomCode } = useGameStore();
  const [copied, setCopied] = React.useState(false);

  if (!gameOverResult) return null;

  const isWin = gameOverResult.winner === slot;
  const isDraw = gameOverResult.winner === 'draw';

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 20,
      animation: 'fade-in var(--anim-screen) ease',
    }}>
      {/* Result */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, lineHeight: 1 }}>
          {isDraw ? '🤝' : isWin ? '🏆' : '💀'}
        </div>
        <h2 style={{
          marginTop: 12,
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32,
          color: isDraw ? 'var(--color-text-secondary)' : isWin ? 'var(--color-ready)' : '#EF4444',
          letterSpacing: '0.05em',
        }}>
          {isDraw ? 'DRAW' : isWin ? 'VICTORY!' : 'DEFEAT'}
        </h2>
        <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 13 }}>
          {gameOverResult.reason.replace('_', ' ')}
        </p>
      </div>

      {/* Nexus HP summary */}
      <div style={{
        display: 'flex', gap: 24,
        background: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border-accent)',
        borderRadius: 10, padding: '12px 24px',
      }}>
        {[0, 1].map(p => (
          <div key={p} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4,
              fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
            }}>
              {p === slot ? 'YOUR NEXUS' : 'OPP NEXUS'}
            </div>
            <div style={{
              fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)',
              color: (gameOverResult.finalNexusHealth[p] ?? 0) > 0 ? 'var(--color-nexus-hp)' : '#EF4444',
            }}>
              {gameOverResult.finalNexusHealth[p] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
        <button
          onClick={copyLink}
          style={{
            background: copied ? 'var(--color-ready)' : 'var(--color-surface-raised)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-accent)',
            borderRadius: 8, padding: '12px 24px',
            fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)',
            cursor: 'pointer', letterSpacing: '0.05em',
          }}
        >
          {copied ? '✓ COPIED!' : '📋 COPY ROOM LINK — PLAY AGAIN'}
        </button>
        <button
          onClick={resetToLobby}
          style={{
            background: 'var(--color-player0)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '14px 24px',
            fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)',
            cursor: 'pointer', letterSpacing: '0.05em',
          }}
        >
          🏠 BACK TO LOBBY
        </button>
      </div>
    </div>
  );
}
