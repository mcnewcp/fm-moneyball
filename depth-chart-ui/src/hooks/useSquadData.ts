import { useState, useEffect, useCallback } from 'react';
import type { Player } from '../types';

interface SquadDataResponse {
  players: Player[];
  filename: string;
  count: number;
}

interface UseSquadDataResult {
  players: Player[];
  filename: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSquadData(): UseSquadDataResult {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filename, setFilename] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSquad = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/squad');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to load squad');
      }

      const data: SquadDataResponse = await response.json();
      setPlayers(data.players);
      setFilename(data.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSquad();
  }, [fetchSquad]);

  return {
    players,
    filename,
    loading,
    error,
    refetch: fetchSquad,
  };
}
