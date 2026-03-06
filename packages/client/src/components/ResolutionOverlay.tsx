import React from 'react';
import type { ResolutionResult, CombatEvent } from '@snap-grid/shared';
import { useGameStore } from '../store/gameStore';

function EventLine({ event }: { event: CombatEvent }) {
  const iconMap: Record<string, string> = {
    CLASH: '⚔',
    UNCONTESTED: '🏹',
    SPELL_DAMAGE: '🔥',
    SPELL_HEAL: '💚',
    SPELL_BUFF: '⬆',
    CARD_DESTROYED: '💀',
    NEXUS_DAMAGED: '💥',
    SHIELD_ABSORB: '🛡',
  };

  const colorMap: Record<string, string> = {
    CLASH: 'var(--color-text-primary)',
    UNCONTESTED: 'var(--color-power)',
    SPELL_DAMAGE: 'var(--color-damage)',
    SPELL_HEAL: 'var(--color-heal)',
    SPELL_BUFF: 'var(--color-player0)',
    CARD_DESTROYED: '#EF4444',
    NEXUS_DAMAGED: 'var(--color-frontline)',
    SHIELD_ABSORB: 'var(--color-shield)',
  };

  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-start',
      fontSize: 12, color: colorMap[event.type] ?? 'var(--color-text-secondary)',
      padding: '3px 0', borderBottom: '1px solid var(--color-border)',
      animation: 'fade-in 0.3s ease',
    }}>
      <span style={{ flexShrink: 0, fontSize: 14 }}>{iconMap[event.type] ?? '•'}</span>
      <span style={{ lineHeight: 1.4 }}>{event.description}</span>
      {event.damage && (
        <span style={{ marginLeft: 'auto', flexShrink: 0, fontWeight: 700, color: '#EF4444' }}>
          -{event.damage}
        </span>
      )}
      {event.healAmount && (
        <span style={{ marginLeft: 'auto', flexShrink: 0, fontWeight: 700, color: 'var(--color-heal)' }}>
          +{event.healAmount}
        </span>
      )}
    </div>
  );
}

export function ResolutionOverlay() {
  const { screen, lastResolution, slot } = useGameStore();
  if (screen !== 'RESOLVING' || !lastResolution) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column',
      animation: 'fade-in 0.3s ease',
    }}>
      {/* Banner */}
      <div style={{
        background: 'var(--color-frontline)',
        padding: '12px 24px',
        textAlign: 'center',
        animation: 'slide-in-down var(--anim-banner) ease',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
          color: '#fff', letterSpacing: '0.15em',
        }}>
          ⚔ RESOLVING TURN {lastResolution.turn} ⚔
        </span>
      </div>

      {/* Winner announcement (if any) */}
      {lastResolution.winner !== null && (
        <div style={{
          padding: '10px 24px', textAlign: 'center',
          background: lastResolution.winner === slot ? '#0a2a0a' : '#2a0a0a',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
            color: lastResolution.winner === slot ? 'var(--color-ready)' :
                   lastResolution.winner === 'draw' ? 'var(--color-text-secondary)' : '#EF4444',
          }}>
            {lastResolution.winner === 'draw' ? '🤝 DRAW!' :
             lastResolution.winner === slot ? '🏆 YOU WIN!' : '💀 YOU LOSE!'}
          </span>
        </div>
      )}

      {/* Event log */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: 0,
      }}>
        <div style={{
          fontSize: 11, color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
          marginBottom: 8,
        }}>
          COMBAT LOG
        </div>
        {lastResolution.events.map((ev, i) => (
          <EventLine key={i} event={ev} />
        ))}
        {lastResolution.events.length === 0 && (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
            No actions this turn.
          </div>
        )}
      </div>

      <div style={{
        padding: '12px 16px',
        textAlign: 'center', fontSize: 12,
        color: 'var(--color-text-muted)',
        borderTop: '1px solid var(--color-border)',
      }}>
        Next turn starting automatically…
      </div>
    </div>
  );
}
