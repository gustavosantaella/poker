import { AnteMode, BlindGrowth, TableStatus, TournamentStatus } from '@/api/types';

export interface Option<T extends string = string> {
  label: string;
  value: T;
}

export const TABLE_STATUS_VALUES: TableStatus[] = ['open', 'running', 'paused', 'closed'];

export const TOURNAMENT_STATUS_VALUES: TournamentStatus[] = [
  'scheduled',
  'registering',
  'running',
  'paused',
  'completed',
  'cancelled',
];

export const GROWTH_VALUES: BlindGrowth[] = ['slow', 'normal', 'fast'];

export const ANTE_MODE_VALUES: AnteMode[] = ['none', 'per_player', 'bb_ante'];

export interface ColorPreset {
  name: string;
  hex: string;
}

export const CHIP_COLOR_PRESETS: ColorPreset[] = [
  { name: 'White', hex: '#F5F5F5' },
  { name: 'Blue', hex: '#2F6FED' },
  { name: 'Green', hex: '#2E9E5B' },
  { name: 'Red', hex: '#E5484D' },
  { name: 'Black', hex: '#1B1F24' },
  { name: 'Purple', hex: '#8E4EC6' },
  { name: 'Orange', hex: '#F76B15' },
  { name: 'Yellow', hex: '#F7B32B' },
  { name: 'Grey', hex: '#6B7280' },
  { name: 'Pink', hex: '#F472B6' },
  { name: 'Brown', hex: '#8D6E63' },
  { name: 'Turquoise', hex: '#14B8A6' },
];

export const GAME_TYPE_PRESETS = [
  { name: "Texas Hold'em", holeCards: 2, communityCards: 5, description: 'Classic community-card game with two hole cards.' },
  { name: 'Pot-Limit Omaha (PLO4)', holeCards: 4, communityCards: 5, description: 'Omaha with four hole cards, use exactly two.' },
  { name: 'PLO5', holeCards: 5, communityCards: 5, description: 'Pot-Limit Omaha with five hole cards.' },
  { name: 'Short Deck', holeCards: 2, communityCards: 5, description: 'Six-plus hold-em played with a 36-card deck.' },
  { name: '2-7 Triple Draw', holeCards: 5, communityCards: 0, description: 'Lowball draw game; lowest five-card hand wins.' },
];
