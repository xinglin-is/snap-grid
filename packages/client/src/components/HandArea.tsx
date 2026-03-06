import React from 'react';
import type { CardInstance } from '@snap-grid/shared';
import { useGameStore } from '../store/gameStore';
import { CardComponent } from './CardComponent';

interface HandAreaProps {
  hand: CardInstance[];
  energy: number;
  maxEnergy: number;
  submitted: boolean;
}

export function HandArea({ hand, energy, maxEnergy, submitted }: HandAreaProps) {
  const { selectedHandCard, selectHandCard } = useGameStore();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: '8px 16px 0',
      background: 'var(--color-surface)',
      borderTop: '1px solid var(--color-border)',
      flexShrink: 0,
    }}>
      {/* Energy bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
          color: 'var(--color-energy)',
        }}>⚡ ENERGY</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: maxEnergy }).map((_, i) => (
            <div key={i} style={{
              width: 16, height: 16, borderRadius: 3,
              background: i < energy ? 'var(--color-energy)' : 'var(--color-disabled)',
              transition: 'background var(--anim-micro)',
            }} />
          ))}
        </div>
        <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
          {energy}/{maxEnergy}
        </span>
      </div>

      {/* Hand cards */}
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 8,
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}>
        {hand.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 12, padding: '8px 0' }}>
            No cards in hand
          </div>
        ) : hand.map(card => (
          <CardComponent
            key={card.instanceId}
            card={card}
            context="hand"
            isSelected={selectedHandCard?.instanceId === card.instanceId}
            onClick={() => {
              if (submitted) return;
              if (selectedHandCard?.instanceId === card.instanceId) {
                selectHandCard(null);
              } else {
                selectHandCard(card);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
