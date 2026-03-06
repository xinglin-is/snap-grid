import React from 'react';
import type { CardInstance, BoardState, Column } from '@snap-grid/shared';
import { useGameStore } from '../store/gameStore';
import { CardComponent } from './CardComponent';

interface GridBoardProps {
  board: BoardState;
  slot: 0 | 1;
}

function NexusDisplay({ hp, maxHp, owner }: { hp: number; maxHp: number; owner: 0 | 1 }) {
  const pct = Math.max(0, hp / maxHp);
  const color = pct > 0.5 ? 'var(--color-nexus-hp)' : pct > 0.25 ? '#F97316' : '#EF4444';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 2, fontSize: 10, color: 'var(--color-text-secondary)',
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-nexus)', fontSize: 11 }}>
        NEXUS
      </div>
      <div style={{
        width: 48, height: 5, background: '#1a1a2e', borderRadius: 3,
        overflow: 'hidden', border: '1px solid var(--color-border-accent)',
      }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: color, transition: 'width 0.5s' }} />
      </div>
      <div style={{ color, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
        {hp}/{maxHp}
      </div>
    </div>
  );
}

function GridCell({
  x, y, card, slot, isOwnTerritory, onClick,
}: {
  x: number; y: number;
  card: CardInstance | null;
  slot: 0 | 1;
  isOwnTerritory: boolean;
  onClick?: () => void;
}) {
  const { selectedHandCard } = useGameStore();
  const isPlaceable = isOwnTerritory && !card && !!selectedHandCard;

  return (
    <div
      onClick={onClick}
      style={{
        width: 'var(--cell-w)',
        height: 'var(--cell-h)',
        background: isOwnTerritory ? 'var(--color-cell-own-empty)' : 'var(--color-cell-opp-empty)',
        border: `1px solid ${isPlaceable ? 'var(--color-player0)' : 'var(--color-cell-border)'}`,
        borderRadius: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isPlaceable ? 'pointer' : 'default',
        boxShadow: isPlaceable ? '0 0 0 2px var(--color-player0)44 inset' : 'none',
        transition: 'border-color var(--anim-micro), box-shadow var(--anim-micro)',
        padding: 3,
        position: 'relative',
      }}
    >
      {/* Coordinate label (debug, faint) */}
      <div style={{
        position: 'absolute', top: 2, left: 3,
        fontSize: 7, color: 'var(--color-text-muted)', opacity: 0.5,
        fontFamily: 'var(--font-body)',
      }}>
        {x},{y}
      </div>

      {card && (
        <CardComponent
          card={card}
          context="board"
          isOpponent={card.ownerId !== slot}
        />
      )}

      {isPlaceable && !card && (
        <div style={{
          fontSize: 20, color: 'var(--color-player0)', opacity: 0.4,
          pointerEvents: 'none',
        }}>+</div>
      )}
    </div>
  );
}

export function GridBoard({ board, slot }: GridBoardProps) {
  const { placeCard } = useGameStore();

  // Player 0 is at bottom (rows y=2,3), Player 1 is at bottom (rows y=0,1) for them
  // From the viewer's perspective: opponent = top (y=0,1), player = bottom (y=2,3)
  const playerOwnRows = slot === 0 ? [2, 3] : [0, 1];
  const opponentRows = slot === 0 ? [0, 1] : [2, 3];

  // Render rows top→bottom: opponent top (far), then frontline, then player bottom
  const topRows = slot === 0 ? [0, 1] : [3, 2];      // rows shown at top of screen
  const bottomRows = slot === 0 ? [2, 3] : [1, 0];   // rows shown at bottom

  const renderRow = (y: number) => (
    <div key={y} style={{ display: 'flex', gap: 6 }}>
      {[0, 1, 2].map(x => {
        const card = board.cells[x as Column][y];
        const isOwnTerritory = playerOwnRows.includes(y);
        return (
          <GridCell
            key={`${x}-${y}`}
            x={x} y={y}
            card={card}
            slot={slot}
            isOwnTerritory={isOwnTerritory}
            onClick={isOwnTerritory ? () => placeCard(x, y) : undefined}
          />
        );
      })}
    </div>
  );

  const oppNexus = board.nexus[slot === 0 ? 1 : 0];
  const ownNexus = board.nexus[slot];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 16px' }}>
      {/* Opponent Nexus status */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 2 }}>
        <NexusDisplay hp={oppNexus.currentHealth} maxHp={oppNexus.maxHealth} owner={oppNexus.owner} />
      </div>

      {/* Opponent rows */}
      {topRows.map(y => renderRow(y))}

      {/* THE FRONTLINE */}
      <div style={{
        height: 28,
        background: 'linear-gradient(90deg, transparent, var(--color-frontline-glow), transparent)',
        border: '1px solid var(--color-frontline)',
        borderRadius: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'frontline-pulse 2s ease-in-out infinite',
        flexShrink: 0,
        margin: '2px 0',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11,
          color: 'var(--color-frontline)', letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          ⚔ Frontline ⚔
        </span>
      </div>

      {/* Player rows */}
      {bottomRows.map(y => renderRow(y))}

      {/* Player Nexus status */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
        <NexusDisplay hp={ownNexus.currentHealth} maxHp={ownNexus.maxHealth} owner={ownNexus.owner} />
      </div>
    </div>
  );
}
