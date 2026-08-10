export type UserRole = 'admin' | 'manager';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
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

export type TableStatus = 'open' | 'running' | 'paused' | 'closed';

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
  notes: string | null;
  isActive: boolean;
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

export type BlindGrowth = 'slow' | 'normal' | 'fast';
export type AnteMode = 'none' | 'per_player' | 'bb_ante';

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

export interface Tournament {
  id: number;
  name: string;
  gameTypeId: number | null;
  gameType: GameType | null;
  startDate: string;
  status: TournamentStatus;
  buyIn: number;
  fee: number;
  startingStack: number;
  maxPlayers: number | null;
  /** Total de reservas y jugadores aceptados (calculados a partir de las reservas). */
  reservedCount?: number;
  playersCount?: number;
  registrationOpen: boolean;
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
  adminFeeType: 'percent' | 'fixed' | null;
  adminFeeValue: number | null;
  blindStructure: BlindStructureItem[] | null;
  blindConfig: BlindConfig | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  currentLevel: number | null;
  levelStartedAt: string | null;
  /** Total de rebuys realizados en el torneo. */
  currentReEntries: number;
}

export interface DashboardStats {
  tables: number;
  openTables: number;
  tournaments: number;
  activeTournaments: number;
  chips: number;
  gameTypes: number;
  users: number;
}

export interface AuthResult {
  user: User;
  accessToken: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ChipPayload {
  value: number;
  color: string;
  hexColor: string;
  quantity?: number | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface GameTypePayload {
  name: string;
  description?: string;
  holeCards?: number;
  communityCards?: number;
  isActive?: boolean;
}

export interface TablePayload {
  name: string;
  gameTypeId: number | null;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  seats?: number;
  status?: TableStatus;
  notes?: string;
  isActive?: boolean;
}

export interface TournamentPayload {
  name: string;
  gameTypeId: number | null;
  startDate: string;
  status?: TournamentStatus;
  buyIn: number;
  fee?: number;
  startingStack: number;
  maxPlayers?: number | null;
  registrationOpen?: boolean;
  reEntryEnabled?: boolean;
  maxReEntries?: number | null;
  lateRegistrationEnabled?: boolean;
  lateRegistrationUntilLevel?: number | null;
  addOnEnabled?: boolean;
  addOnAmount?: number | null;
  addOnStack?: number | null;
  addOnUntilLevel?: number | null;
  guaranteedPrize?: number | null;
  paidPlacesType?: 'percent' | 'fixed';
  paidPlacesValue?: number | null;
  adminFeeType?: 'percent' | 'fixed';
  adminFeeValue?: number | null;
  blindConfig: BlindConfig;
  /** Estructura manual (si el usuario la genero/edito en el formulario). Si se omite, el backend la regenera desde blindConfig. */
  blindStructure?: BlindStructureItem[] | null;
}

export type ReservationStatus = 'pending' | 'accepted' | 'rejected';

export interface TournamentReservation {
  id: number;
  tournamentId: number;
  userId: number;
  user: User;
  status: ReservationStatus;
  /** Stack inicial del jugador (fichas). Null = usa el startingStack del torneo. */
  stack: number | null;
  /** Cantidad de rebuys (re-entradas) realizados por el jugador. */
  reEntries: number;
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

export interface TournamentPrize {
  id: number;
  tournamentId: number;
  place: number;
  amount: number;
  createdAt: string;
  updatedAt: string;
}