export type UserRole = 'admin' | 'manager' | 'player';

export interface Club {
  id: number;
  code: string;
  name: string;
  photoUrl: string | null;
  address: string | null;
  phone: string | null;
  adminUserId: number;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
  tablesCount?: number;
  tournamentsCount?: number;
  membersCount?: number;
}

export type ClubMembershipStatus = 'pending' | 'accepted' | 'rejected';

export interface ClubMembership {
  id: number;
  clubId: number;
  userId: number;
  status: ClubMembershipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  alias: string | null;
  country: string | null;
  phone: string | null;
  photoUrl: string | null;
  address: string | null;
  city: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GameType {
  id: number;
  name: string;
  description: string | null;
  holeCards: number;
  communityCards: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TableStatus = 'open' | 'running' | 'paused' | 'closed';
export type GameMode = 'live' | 'online';

export interface PokerTable {
  id: number;
  name: string;
  gameTypeId: number | null;
  gameType: GameType | null;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  seats: number;
  status: TableStatus;
  mode: GameMode;
  currency: string;
  notes: string | null;
  isActive: boolean;
  clubId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export type TournamentStatus =
  | 'scheduled'
  | 'registering'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled';

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
  afterLevel: number;
  durationMin: number;
}

export type BlindStructureItem = BlindLevelItem | BlindBreakItem;

export interface Tournament {
  id: number;
  name: string;
  gameTypeId: number | null;
  gameType: GameType | null;
  startDate: string;
  status: TournamentStatus;
  mode: GameMode;
  registrationOpen: boolean;
  tableCount: number;
  currency: string;
  buyIn: number;
  fee: number;
  startingStack: number;
  maxPlayers: number | null;
  currentPlayers: number;
  reservedPlayers: number;
  currentReEntries: number;
  reEntryEnabled: boolean;
  maxReEntries: number | null;
  lateRegistrationEnabled: boolean;
  lateRegistrationUntilLevel: number | null;
  addOnEnabled: boolean;
  addOnAmount: number | null;
  addOnStack: number | null;
  addOnUntilLevel: number | null;
  guaranteedPrize: number | null;
  paidPlacesType: 'percent' | 'fixed' | null;
  paidPlacesValue: number | null;
  blindStructure: BlindStructureItem[] | null;
  currentLevel: number | null;
  levelStartedAt: string | null;
  startedAt: string | null;
  isActive: boolean;
  clubId?: number | null;
  createdAt: string;
  updatedAt: string;
  reservedCount?: number;
  playersCount?: number;
}

export interface BlindStructureSummary {
  levelCount: number;
  breakCount: number;
  estimatedDurationMin: number;
  finalLevel: BlindLevelItem | null;
}


export interface TableReservation {
  id: number;
  tableId: number;
  userId: number;
  user: User;
  table?: PokerTable;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface TournamentReservation {
  id: number;
  tournamentId: number;
  userId: number;
  user: User;
  tournament?: Tournament;
  status: 'pending' | 'accepted' | 'rejected' | 'stood_up' | 'eliminated';
  stack: number | null;
  reEntries: number;
  tableNumber: number | null;
  seatNumber: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentPrize {
  id: number;
  tournamentId: number;
  place: number;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Chip {
  id: number;
  value: number;
  color: string;
  hexColor: string;
  quantity: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentChip {
  id: number;
  tournamentId: number;
  chipId: number;
  chip: Chip;
  discardLevel: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AuthResult {
  user: User;
  accessToken: string;
}
