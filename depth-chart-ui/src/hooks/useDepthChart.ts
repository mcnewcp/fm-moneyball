import { useState, useEffect, useCallback } from 'react';
import type { DepthChartState, PositionName, Tier } from '../types';
import { POSITIONS } from '../types';

interface UseDepthChartResult {
  depthChart: DepthChartState | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  assignPlayer: (position: PositionName, tier: Tier, playerId: string | null) => void;
  clearSlot: (position: PositionName, tier: Tier) => void;
  save: () => Promise<boolean>;
  getAssignedPlayerIds: () => Set<string>;
  hasUnsavedChanges: boolean;
}

function createEmptyDepthChart(): DepthChartState {
  return {
    version: 1,
    createdAt: '',
    squadFile: '',
    positions: Object.fromEntries(
      POSITIONS.map((pos) => [
        pos,
        {
          first: { playerId: null },
          second: { playerId: null },
          third: { playerId: null },
        },
      ])
    ),
  };
}

export function useDepthChart(): UseDepthChartResult {
  const [depthChart, setDepthChart] = useState<DepthChartState | null>(null);
  const [originalChart, setOriginalChart] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load depth chart on mount
  useEffect(() => {
    const fetchDepthChart = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/depth-chart');

        if (!response.ok) {
          throw new Error('Failed to load depth chart');
        }

        const data = await response.json();
        setDepthChart(data.depthChart);
        setOriginalChart(JSON.stringify(data.depthChart));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Initialize with empty chart on error
        const empty = createEmptyDepthChart();
        setDepthChart(empty);
        setOriginalChart(JSON.stringify(empty));
      } finally {
        setLoading(false);
      }
    };

    fetchDepthChart();
  }, []);

  // Assign a player to a position/tier
  const assignPlayer = useCallback(
    (position: PositionName, tier: Tier, playerId: string | null) => {
      setDepthChart((prev) => {
        if (!prev) return prev;

        // If assigning a player, first remove them from any existing slot
        let newPositions = { ...prev.positions };

        if (playerId) {
          for (const pos of POSITIONS) {
            for (const t of ['first', 'second', 'third'] as Tier[]) {
              if (newPositions[pos][t].playerId === playerId) {
                newPositions = {
                  ...newPositions,
                  [pos]: {
                    ...newPositions[pos],
                    [t]: { playerId: null },
                  },
                };
              }
            }
          }
        }

        // Now assign to the new slot
        newPositions = {
          ...newPositions,
          [position]: {
            ...newPositions[position],
            [tier]: { playerId },
          },
        };

        return {
          ...prev,
          positions: newPositions,
        };
      });
    },
    []
  );

  // Clear a specific slot
  const clearSlot = useCallback((position: PositionName, tier: Tier) => {
    setDepthChart((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        positions: {
          ...prev.positions,
          [position]: {
            ...prev.positions[position],
            [tier]: { playerId: null },
          },
        },
      };
    });
  }, []);

  // Save depth chart to server
  const save = useCallback(async (): Promise<boolean> => {
    if (!depthChart) return false;

    setSaving(true);

    try {
      const response = await fetch('/api/depth-chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ depthChart }),
      });

      if (!response.ok) {
        throw new Error('Failed to save depth chart');
      }

      // Update original to track changes
      setOriginalChart(JSON.stringify(depthChart));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      return false;
    } finally {
      setSaving(false);
    }
  }, [depthChart]);

  // Get all currently assigned player IDs
  const getAssignedPlayerIds = useCallback((): Set<string> => {
    const ids = new Set<string>();

    if (!depthChart) return ids;

    for (const pos of POSITIONS) {
      for (const tier of ['first', 'second', 'third'] as Tier[]) {
        const playerId = depthChart.positions[pos]?.[tier]?.playerId;
        if (playerId) {
          ids.add(playerId);
        }
      }
    }

    return ids;
  }, [depthChart]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = depthChart
    ? JSON.stringify(depthChart) !== originalChart
    : false;

  return {
    depthChart,
    loading,
    error,
    saving,
    assignPlayer,
    clearSlot,
    save,
    getAssignedPlayerIds,
    hasUnsavedChanges,
  };
}
