import type { Player, PositionName, Tier, DepthChartPosition } from '../types';
import { PlayerSlot } from './PlayerSlot';

interface PositionCardProps {
  position: PositionName;
  slots: DepthChartPosition;
  players: Player[];
  firstScoreRange: { min: number; max: number };
  secondScoreRange: { min: number; max: number };
  thirdScoreRange: { min: number; max: number };
  onSlotClick: (position: PositionName, tier: Tier) => void;
  gridRow: number;
  gridColumn: string;
}

export function PositionCard({
  position,
  slots,
  players,
  firstScoreRange,
  secondScoreRange,
  thirdScoreRange,
  onSlotClick,
  gridRow,
  gridColumn,
}: PositionCardProps) {
  const getPlayer = (playerId: string | null): Player | null => {
    if (!playerId) return null;
    return players.find((p) => p.uid === playerId) ?? null;
  };

  const firstPlayer = getPlayer(slots.first.playerId);
  const secondPlayer = getPlayer(slots.second.playerId);
  const thirdPlayer = getPlayer(slots.third.playerId);

  return (
    <div
      className="position-card"
      style={{
        gridRow,
        gridColumn,
      }}
    >
      <div className="position-header">{position}</div>
      <div className="position-slots">
        <PlayerSlot
          player={firstPlayer}
          position={position}
          tier="first"
          scoreRange={firstScoreRange}
          onClick={() => onSlotClick(position, 'first')}
        />
        <PlayerSlot
          player={secondPlayer}
          position={position}
          tier="second"
          scoreRange={secondScoreRange}
          onClick={() => onSlotClick(position, 'second')}
        />
        <PlayerSlot
          player={thirdPlayer}
          position={position}
          tier="third"
          scoreRange={thirdScoreRange}
          onClick={() => onSlotClick(position, 'third')}
        />
      </div>
    </div>
  );
}
