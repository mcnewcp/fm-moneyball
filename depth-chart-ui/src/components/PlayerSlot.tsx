import type { Player, Tier } from '../types';
import { getScoreColor } from '../utils/colorUtils';
import { getAgeBadge, getAgeCategory } from '../utils/ageUtils';

interface PlayerSlotProps {
  player: Player | null;
  position: string;
  tier: Tier;
  scoreRange: { min: number; max: number };
  onClick: () => void;
}

const tierLabels: Record<Tier, string> = {
  first: '1st',
  second: '2nd',
  third: '3rd',
};

export function PlayerSlot({
  player,
  position,
  tier,
  scoreRange,
  onClick,
}: PlayerSlotProps) {
  const score = player?.scores[position];
  const backgroundColor = player && score
    ? getScoreColor(score, scoreRange.min, scoreRange.max)
    : 'var(--bg-card)';
  const ageBadge = player ? getAgeBadge(player.age) : null;
  const ageCategory = player ? getAgeCategory(player.age) : '';

  return (
    <button
      className={`player-slot ${player ? 'filled' : 'empty'}`}
      style={{ backgroundColor }}
      onClick={onClick}
      title={player ? `${player.name} (Age: ${player.age}, ${ageCategory})` : `Select ${tierLabels[tier]} choice`}
    >
      {player ? (
        <>
          <span className="player-score">{score?.toFixed(1) ?? '-'}</span>
          <span className="player-name">{player.name}</span>
          {ageBadge && (
            <span className={`age-badge ${ageBadge.className}`} title={ageCategory}>
              {ageBadge.label}
            </span>
          )}
        </>
      ) : (
        <span className="empty-label">+ {tierLabels[tier]}</span>
      )}
    </button>
  );
}
