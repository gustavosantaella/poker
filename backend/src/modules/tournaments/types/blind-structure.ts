export const BlindGrowthValues = ['slow', 'normal', 'fast'] as const;
export type BlindGrowth = (typeof BlindGrowthValues)[number];

export const AnteModeValues = ['none', 'per_player', 'bb_ante'] as const;
export type AnteMode = (typeof AnteModeValues)[number];

export interface BlindLevelItem {
  type: 'level';
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMin: number;
}

export interface BlindBreakItem {
  type: 'break';
  durationMin: number;
  afterLevel: number;
}

export type BlindStructureItem = BlindLevelItem | BlindBreakItem;

export interface BlindStructureSummary {
  levelCount: number;
  breakCount: number;
  estimatedDurationMin: number;
  finalLevel: BlindLevelItem | null;
}

export interface BlindStructureResult {
  items: BlindStructureItem[];
  summary: BlindStructureSummary;
}

export interface BlindConfig {
  startingStack: number;
  startingBigBlind?: number;
  levelDurationMin?: number;
  numberOfLevels?: number;
  growth?: BlindGrowth;
  anteMode?: AnteMode;
  anteStartLevel?: number;
  breakEveryLevels?: number;
  breakDurationMin?: number;
  maxPlayers?: number | null;
  addOnEnabled?: boolean;
  addOnStack?: number;
  reEntryEnabled?: boolean;
  maxReEntries?: number;
}

export interface BuildBlindStructureParams extends BlindConfig {}