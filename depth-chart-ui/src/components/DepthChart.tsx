import { useState, useMemo } from 'react';
import type { Player, DepthChartState, PositionName, Tier } from '../types';
import { POSITIONS, POSITION_LAYOUT } from '../types';
import { PositionCard } from './PositionCard';
import { PlayerSelector } from './PlayerSelector';
import { getScoreRangeFromScores } from '../utils/colorUtils';

interface DepthChartProps {
  players: Player[];
  depthChart: DepthChartState;
  onAssignPlayer: (position: PositionName, tier: Tier, playerId: string | null) => void;
  onSave: () => Promise<boolean>;
  saving: boolean;
  hasUnsavedChanges: boolean;
  getAssignedPlayerIds: () => Set<string>;
}

export function DepthChart({
  players,
  depthChart,
  onAssignPlayer,
  onSave,
  saving,
  hasUnsavedChanges,
  getAssignedPlayerIds,
}: DepthChartProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionName | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Calculate score ranges for each tier based on players' scores at their ASSIGNED positions
  const { firstScoreRange, secondScoreRange, thirdScoreRange } = useMemo(() => {
    const firstScores: number[] = [];
    const secondScores: number[] = [];
    const thirdScores: number[] = [];

    for (const pos of POSITIONS) {
      const firstId = depthChart.positions[pos]?.first?.playerId;
      const secondId = depthChart.positions[pos]?.second?.playerId;
      const thirdId = depthChart.positions[pos]?.third?.playerId;

      // Get each player's score for THEIR assigned position (pos)
      if (firstId) {
        const player = players.find((p) => p.uid === firstId);
        if (player?.scores[pos]) firstScores.push(player.scores[pos]);
      }
      if (secondId) {
        const player = players.find((p) => p.uid === secondId);
        if (player?.scores[pos]) secondScores.push(player.scores[pos]);
      }
      if (thirdId) {
        const player = players.find((p) => p.uid === thirdId);
        if (player?.scores[pos]) thirdScores.push(player.scores[pos]);
      }
    }

    return {
      firstScoreRange: getScoreRangeFromScores(firstScores),
      secondScoreRange: getScoreRangeFromScores(secondScores),
      thirdScoreRange: getScoreRangeFromScores(thirdScores),
    };
  }, [depthChart.positions, players]);

  // Get available (unassigned) players for the selector
  const availablePlayers = useMemo(() => {
    const assignedIds = getAssignedPlayerIds();
    // Include the current player in the slot (if any) so they appear in the list
    const currentPlayerId =
      selectedPosition && selectedTier
        ? depthChart.positions[selectedPosition]?.[selectedTier]?.playerId
        : null;

    return players.filter(
      (p) => !assignedIds.has(p.uid) || p.uid === currentPlayerId
    );
  }, [players, getAssignedPlayerIds, selectedPosition, selectedTier, depthChart.positions]);

  const handleSlotClick = (position: PositionName, tier: Tier) => {
    setSelectedPosition(position);
    setSelectedTier(tier);
    setSelectorOpen(true);
  };

  const handlePlayerSelect = (playerId: string | null) => {
    if (selectedPosition && selectedTier) {
      onAssignPlayer(selectedPosition, selectedTier, playerId);
    }
    setSelectorOpen(false);
    setSelectedPosition(null);
    setSelectedTier(null);
  };

  const handleSave = async () => {
    const success = await onSave();
    if (success) {
      setSaveMessage('Saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } else {
      setSaveMessage('Failed to save');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const currentPlayerId =
    selectedPosition && selectedTier
      ? depthChart.positions[selectedPosition]?.[selectedTier]?.playerId ?? null
      : null;

  return (
    <div className="depth-chart-container">
      <div className="depth-chart-header">
        <h1>Team Depth Chart</h1>
        <div className="header-actions">
          {saveMessage && (
            <span className={`save-message ${saveMessage.includes('Failed') ? 'error' : 'success'}`}>
              {saveMessage}
            </span>
          )}
          <button
            className={`save-button ${hasUnsavedChanges ? 'has-changes' : ''}`}
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
          >
            {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      <div className="field-grid">
        {POSITION_LAYOUT.map((layout) => (
          <PositionCard
            key={layout.position}
            position={layout.position}
            slots={
              depthChart.positions[layout.position] ?? {
                first: { playerId: null },
                second: { playerId: null },
                third: { playerId: null },
              }
            }
            players={players}
            firstScoreRange={firstScoreRange}
            secondScoreRange={secondScoreRange}
            thirdScoreRange={thirdScoreRange}
            onSlotClick={handleSlotClick}
            gridRow={layout.gridRow}
            gridColumn={layout.gridColumn}
          />
        ))}
      </div>

      <PlayerSelector
        isOpen={selectorOpen}
        position={selectedPosition}
        tier={selectedTier}
        availablePlayers={availablePlayers}
        currentPlayerId={currentPlayerId}
        onSelect={handlePlayerSelect}
        onClose={() => setSelectorOpen(false)}
      />
    </div>
  );
}
