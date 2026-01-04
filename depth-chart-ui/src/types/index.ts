import { POSITIONS, PositionName } from '../shared/constants';

// Re-export for convenience
export { POSITIONS, PositionName };

// Player data from scored CSV
export interface Player {
  uid: string;
  name: string;
  position: string;
  bestPos: string;
  age: number;
  type: string;
  scores: Record<string, number>; // Position name -> score
}

// Depth chart slot assignment
export interface DepthChartSlot {
  playerId: string | null;
}

// Depth chart for a single position
export interface DepthChartPosition {
  first: DepthChartSlot;
  second: DepthChartSlot;
  third: DepthChartSlot;
}

// Full depth chart state
export interface DepthChartState {
  version: number;
  createdAt: string;
  squadFile: string;
  positions: Record<string, DepthChartPosition>;
}

// Position layout configuration for the field grid
export interface PositionLayoutConfig {
  position: PositionName;
  gridRow: number;
  gridColumn: string; // CSS grid-column value
}

// Field layout: 6 rows from top (striker) to bottom (goalkeeper)
export const POSITION_LAYOUT: PositionLayoutConfig[] = [
  // Row 1: Striker
  { position: 'P-At', gridRow: 1, gridColumn: '2 / 4' },
  // Row 2: Wingers
  { position: 'IW-Su', gridRow: 2, gridColumn: '1 / 2' },
  { position: 'W-At', gridRow: 2, gridColumn: '4 / 5' },
  // Row 3: Central Midfielders
  { position: 'CM-At', gridRow: 3, gridColumn: '1 / 3' },
  { position: 'MEZ-Su', gridRow: 3, gridColumn: '3 / 5' },
  // Row 4: Defensive Midfielder
  { position: 'DM-Su', gridRow: 4, gridColumn: '2 / 4' },
  // Row 5: Defense line
  { position: 'IWB-Su', gridRow: 5, gridColumn: '1 / 2' },
  { position: 'BPD-De', gridRow: 5, gridColumn: '2 / 3' },
  { position: 'CD-Co', gridRow: 5, gridColumn: '3 / 4' },
  { position: 'IWB-De', gridRow: 5, gridColumn: '4 / 5' },
  // Row 6: Goalkeeper
  { position: 'SK-At', gridRow: 6, gridColumn: '2 / 4' },
];

// Tier type for first/second/third choice
export type Tier = 'first' | 'second' | 'third';
