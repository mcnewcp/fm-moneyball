/**
 * Calculate a red-to-green gradient color based on score within a range
 * @param score - The player's score for the position
 * @param min - Minimum score in the tier
 * @param max - Maximum score in the tier
 * @returns HSL color string
 */
export function getScoreColor(score: number, min: number, max: number): string {
  // Handle edge case where all scores are the same
  if (max === min) {
    return 'hsl(60, 70%, 35%)'; // Yellow-ish for middle
  }

  // Normalize score to 0-1 range
  const normalized = Math.max(0, Math.min(1, (score - min) / (max - min)));

  // Interpolate hue from 0 (red) to 120 (green)
  const hue = normalized * 120;

  // Use consistent saturation and lightness for dark mode
  return `hsl(${hue}, 70%, 35%)`;
}

/**
 * Calculate min and max scores from an array of scores
 * @param scores - Array of scores for players in this tier
 * @returns Object with min and max scores
 */
export function getScoreRangeFromScores(scores: number[]): { min: number; max: number } {
  const validScores = scores.filter((score) => score > 0);

  if (validScores.length === 0) {
    // Default range if no players assigned
    return { min: 0, max: 20 };
  }

  if (validScores.length === 1) {
    // Single player - use a range around their score
    const score = validScores[0];
    return { min: Math.max(0, score - 3), max: Math.min(20, score + 3) };
  }

  return {
    min: Math.min(...validScores),
    max: Math.max(...validScores),
  };
}
