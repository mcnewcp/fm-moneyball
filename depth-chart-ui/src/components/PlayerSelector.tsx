import { useEffect, useRef } from 'react';
import type { Player, PositionName, Tier } from '../types';

interface PlayerSelectorProps {
  isOpen: boolean;
  position: PositionName | null;
  tier: Tier | null;
  availablePlayers: Player[];
  currentPlayerId: string | null;
  onSelect: (playerId: string | null) => void;
  onClose: () => void;
}

const tierLabels: Record<Tier, string> = {
  first: '1st Choice',
  second: '2nd Choice',
  third: '3rd Choice',
};

export function PlayerSelector({
  isOpen,
  position,
  tier,
  availablePlayers,
  currentPlayerId,
  onSelect,
  onClose,
}: PlayerSelectorProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !position || !tier) return null;

  // Sort players by score for this position (descending)
  const sortedPlayers = [...availablePlayers].sort((a, b) => {
    const scoreA = a.scores[position] ?? 0;
    const scoreB = b.scores[position] ?? 0;
    return scoreB - scoreA;
  });

  return (
    <div className="modal-overlay">
      <div className="modal-content" ref={modalRef}>
        <div className="modal-header">
          <h2>
            {position} - {tierLabels[tier]}
          </h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {currentPlayerId && (
            <button
              className="player-option clear-option"
              onClick={() => onSelect(null)}
            >
              <span className="player-score">-</span>
              <span className="player-name">Clear Selection</span>
            </button>
          )}

          {sortedPlayers.length === 0 ? (
            <div className="no-players">No available players</div>
          ) : (
            <div className="player-list">
              {sortedPlayers.map((player) => (
                <button
                  key={player.uid}
                  className="player-option"
                  onClick={() => onSelect(player.uid)}
                >
                  <span className="player-score">
                    {player.scores[position]?.toFixed(1) ?? '-'}
                  </span>
                  <span className="player-name">{player.name}</span>
                  <span className="player-age">Age: {player.age}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
