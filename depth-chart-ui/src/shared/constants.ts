// The 11 positions in our formation
export const POSITIONS = [
  'SK-At',
  'BPD-De',
  'CD-Co',
  'IWB-Su',
  'IWB-De',
  'DM-Su',
  'CM-At',
  'MEZ-Su',
  'IW-Su',
  'W-At',
  'P-At',
] as const;

export type PositionName = (typeof POSITIONS)[number];
