import React from 'react';
import { useGameStore } from '../store/gameStore';

export function WaitingScreen() {
  const { roomCode, shareUrl, opponentReady, slot } = useGameStore();
  const [copied, setCopied] = React.useState(false);

  const copyLink = () => {
    const url = shareUrl ?? `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 40,
          animation: 'spin 2s linear infinite',
          display: 'inline-block',
        }}>⏳</div>
        <h2 style={{
          marginTop: 12,
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
          color: 'var(--color-text-primary)',
        }}>
          {opponentReady ? 'Both ready — resolving…' : 'Waiting for opponent'}
        </h2>
        <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 13 }}>
          {opponentReady ? 'Resolution in progress!' : 'Share your room code to invite a friend'}
        </p>
      </div>

      {/* Room code display */}
      <div style={{
        background: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border-accent)',
        borderRadius: 10,
        padding: '16px 24px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>ROOM CODE</div>
        <div style={{
          fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-display)',
          letterSpacing: '0.2em', color: 'var(--color-frontline)',
        }}>
          {roomCode}
        </div>
      </div>

      <button
        onClick={copyLink}
        style={{
          background: copied ? 'var(--color-ready)' : 'var(--color-player0)',
          color: '#fff', border: 'none', borderRadius: 8,
          padding: '12px 24px', fontSize: 14, fontWeight: 700,
          fontFamily: 'var(--font-display)', cursor: 'pointer',
          letterSpacing: '0.05em', width: '100%', maxWidth: 280,
          transition: 'background var(--anim-micro)',
        }}
      >
        {copied ? '✓ LINK COPIED!' : '📋 COPY INVITE LINK'}
      </button>

      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: 240 }}>
        You are Player {(slot ?? 0) + 1}. Game starts when your opponent joins.
      </div>
    </div>
  );
}
