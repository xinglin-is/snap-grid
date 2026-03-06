import React, { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { LobbyScreen } from './components/LobbyScreen';
import { WaitingScreen } from './components/WaitingScreen';
import { GameScreen } from './components/GameScreen';
import { GameOverScreen } from './components/GameOverScreen';
import { ResolutionOverlay } from './components/ResolutionOverlay';
import './styles/globals.css';

export default function App() {
  const { connect, screen } = useGameStore();

  useEffect(() => {
    connect();
  }, []);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-bg)',
      maxWidth: 480,
      margin: '0 auto',
      position: 'relative',
    }}>
      {/* Resolution overlay sits on top of everything */}
      <ResolutionOverlay />

      {/* App header */}
      <div style={{
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: screen !== 'LOBBY' ? '1px solid var(--color-border)' : 'none',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
          color: 'var(--color-frontline)', letterSpacing: '0.08em',
        }}>
          ⚡ SNAP-GRID
        </span>
        {screen !== 'LOBBY' && screen !== 'WAITING_FOR_OPPONENT' && (
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {screen === 'GAME' ? '🟢 PLANNING' :
             screen === 'RESOLVING' ? '🟠 RESOLVING' :
             screen === 'GAME_OVER' ? '🔴 ENDED' : ''}
          </span>
        )}
      </div>

      {/* Screen routing */}
      {screen === 'LOBBY' && <LobbyScreen />}
      {screen === 'WAITING_FOR_OPPONENT' && <WaitingScreen />}
      {(screen === 'GAME' || screen === 'RESOLVING') && <GameScreen />}
      {screen === 'GAME_OVER' && <GameOverScreen />}
    </div>
  );
}
