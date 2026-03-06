import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

export function LobbyScreen() {
  const { createRoom, joinRoom, error, clearError } = useGameStore();
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'home' | 'join'>('home');

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 24,
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 48,
          fontWeight: 700,
          color: 'var(--color-frontline)',
          letterSpacing: '0.05em',
          textShadow: '0 0 20px var(--color-frontline-glow)',
          lineHeight: 1,
        }}>
          SNAP-GRID
        </h1>
        <p style={{
          marginTop: 8,
          color: 'var(--color-text-secondary)',
          fontSize: 14,
          fontFamily: 'var(--font-body)',
        }}>
          Asynchronous card combat · No account needed
        </p>
      </div>

      {/* Action area */}
      {mode === 'home' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}>
          <button
            onClick={createRoom}
            style={{
              background: 'var(--color-ready)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '16px 24px',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              transition: 'background var(--anim-micro)',
            }}
          >
            ⚔ CREATE GAME
          </button>
          <button
            onClick={() => setMode('join')}
            style={{
              background: 'transparent',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-accent)',
              borderRadius: 8,
              padding: '14px 24px',
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            🔑 JOIN WITH CODE
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}>
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ENTER CODE"
            autoFocus
            style={{
              background: 'var(--color-surface-raised)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-accent)',
              borderRadius: 8,
              padding: '14px 16px',
              fontSize: 20,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textAlign: 'center',
              outline: 'none',
            }}
          />
          <button
            onClick={() => joinCode.length === 6 && joinRoom(joinCode)}
            disabled={joinCode.length !== 6}
            style={{
              background: joinCode.length === 6 ? 'var(--color-player0)' : 'var(--color-disabled)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '14px 24px',
              fontSize: 15,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              cursor: joinCode.length === 6 ? 'pointer' : 'not-allowed',
              letterSpacing: '0.05em',
            }}
          >
            JOIN GAME →
          </button>
          <button
            onClick={() => { setMode('home'); setJoinCode(''); }}
            style={{
              background: 'transparent', color: 'var(--color-text-secondary)',
              border: 'none', cursor: 'pointer', fontSize: 13,
            }}
          >
            ← Back
          </button>
        </div>
      )}

      {error && (
        <div style={{
          background: '#2a0a0a', border: '1px solid #ef4444',
          borderRadius: 8, padding: '10px 14px',
          color: '#ef4444', fontSize: 12, maxWidth: 280, textAlign: 'center',
        }}>
          {error}
          <button onClick={clearError} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      )}
    </div>
  );
}
