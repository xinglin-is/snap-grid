import React from 'react';
import type { CardInstance } from '@snap-grid/shared';
import { STARTER_DECK } from '@snap-grid/shared';
import { useGameStore } from '../store/gameStore';

interface CardProps {
  card: CardInstance;
  context: 'hand' | 'board';
  isSelected?: boolean;
  isOpponent?: boolean;
  onClick?: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  Unit: 'var(--color-unit)',
  Spell: 'var(--color-spell)',
  Structure: 'var(--color-structure)',
};

export function CardComponent({ card, context, isSelected, isOpponent, onClick }: CardProps) {
  const def = STARTER_DECK.find(d => d.id === card.definitionId);
  const typeColor = TYPE_COLORS[def?.type ?? 'Unit'] ?? 'var(--color-unit)';
  const isDamaged = card.currentHealth < card.maxHealth;
  const isCritical = card.currentHealth <= Math.floor(card.maxHealth / 3);
  const isDestroyed = card.currentHealth <= 0;

  const ownerColor = isOpponent ? 'var(--color-player1)' : 'var(--color-player0)';

  if (context === 'hand') {
    return (
      <div
        onClick={onClick}
        style={{
          width: 'var(--card-hand-w)',
          height: 'var(--card-hand-h)',
          background: 'var(--color-surface-raised)',
          border: `2px solid ${isSelected ? ownerColor : 'var(--color-border-accent)'}`,
          borderRadius: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 3px',
          cursor: 'pointer',
          transform: isSelected ? 'translateY(-12px) scale(1.06)' : 'none',
          transition: `transform var(--anim-micro), border-color var(--anim-micro), box-shadow var(--anim-micro)`,
          boxShadow: isSelected ? `0 0 12px ${ownerColor}88` : 'none',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Type color strip */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: typeColor }} />

        {/* Cost badge */}
        <div style={{
          position: 'absolute', top: 4, left: 4,
          background: 'var(--color-energy)', color: '#000',
          borderRadius: '50%', width: 16, height: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-display)',
        }}>
          {def?.cost ?? '?'}
        </div>

        {/* Card name */}
        <div style={{
          marginTop: 14,
          fontSize: 9, fontWeight: 600, fontFamily: 'var(--font-display)',
          color: 'var(--color-text-primary)',
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          padding: '0 2px',
        }}>
          {def?.name ?? card.definitionId}
        </div>

        {/* Stats row */}
        {def?.type !== 'Spell' ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 2px' }}>
            {/* Power */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)',
              color: 'var(--color-power)',
            }}>
              ⚔ {card.power}
            </div>
            {/* Health */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)',
              color: isCritical ? 'var(--color-health-low)' : 'var(--color-health)',
            }}>
              {card.currentHealth} ♥
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 9, color: 'var(--color-spell)', textAlign: 'center' }}>
            {def?.effectId}
          </div>
        )}
      </div>
    );
  }

  // Board context
  return (
    <div
      onClick={onClick}
      style={{
        width: '100%',
        height: '100%',
        background: isOpponent ? '#1a1030' : 'var(--color-surface-raised)',
        border: `1.5px solid ${ownerColor}55`,
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3px 4px',
        cursor: onClick ? 'pointer' : 'default',
        animation: isDestroyed ? 'card-death var(--anim-death) forwards' : undefined,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Shield indicator */}
      {card.shieldCharges > 0 && (
        <div style={{
          position: 'absolute', top: 2, right: 2,
          fontSize: 8, color: 'var(--color-shield)', fontWeight: 700,
        }}>🛡{card.shieldCharges}</div>
      )}

      {/* Name */}
      <div style={{
        fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-display)',
        color: 'var(--color-text-primary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {def?.name ?? card.definitionId}
      </div>

      {/* Stats */}
      {def?.type !== 'Spell' && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{
            background: 'var(--color-power)', borderRadius: 3,
            padding: '1px 4px', fontSize: 10, fontWeight: 700,
            fontFamily: 'var(--font-display)', color: '#fff',
          }}>⚔{card.power}</div>
          <div style={{
            background: isCritical ? 'var(--color-health-low)' : 'var(--color-health)',
            borderRadius: 3, padding: '1px 4px', fontSize: 10, fontWeight: 700,
            fontFamily: 'var(--font-display)', color: '#fff',
          }}>
            {isDamaged ? `${card.currentHealth}/${card.maxHealth}` : card.currentHealth}♥
          </div>
        </div>
      )}
    </div>
  );
}
