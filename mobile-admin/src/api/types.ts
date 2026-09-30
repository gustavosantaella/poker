import { Currency } from '@/constants/currencies';

export type UserRole = 'admin' | 'manager' | 'player';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  address: string | null;
  phone: string | null;
  city: string | null;
  alias: string | null;
  country: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Club {
  id: number;
  code: string;
  name: string;
  photoUrl: string | null;
  address: string | null;
  phone: string | null;
  /** Ubicación del club (opcional). */
  latitude: number | null;
  longitude: number | null;
  /** Redes sociales del club (opcionales). */
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
  website: string | null;
  adminUserId: number;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
  tablesCount?: number;
  tournamentsCount?: number;
  membersCount?: number;
}

export type ClubMemberStatus = 'pending' | 'accepted' | 'rejected';

/** Permisos de un usuario dentro del club. */
export type ClubMemberRole = 'admin' | 'operator' | 'cashier' | 'member';

export interface ClubMember {
  id: number;
  clubId: number;
  userId: number;
  user: User;
  status: ClubMemberStatus;
  role: ClubMemberRole;
  createdAt: string;
  updatedAt: string;
}

export type ClubInvitationStatus =
  'pending' | 'accepted' | 'revoked' | 'expired';

/** Invitación para unirse al club como colaborador con unos permisos. */
export interface ClubInvitation {
  id: number;
  clubId: number;
  email: string;
  role: ClubMemberRole;
  /** Código que el admin comparte con la persona invitada. */
  token: string;
  status: ClubInvitationStatus;
  invitedByUserId: number | null;
  acceptedByUserId: number | null;
  acceptedAt: string | null;
  /** Caducidad de la invitación (a partir de aquí hay que reenviarla). */
  expiresAt: string | null;
  /** Último envío por correo y número total de envíos. */
  lastSentAt: string | null;
  sendCount: number;
  club?: Club;
  createdAt: string;
  updatedAt: string;
}

/** Punto de la serie diaria del dashboard (últimos 7 días). */
export interface ClubDailyMetric {
  /** Fecha en formato `YYYY-MM-DD`. */
  date: string;
  tournaments: number;
  players: number;
  revenue: number;
}

/** Jugador destacado del periodo. */
export interface ClubTopPlayer {
  userId: number;
  name: string;
  email: string;
  tournaments: number;
  reEntries: number;
}

/** Métricas de negocio del club calculadas de las reservas de torneo. */
export interface ClubBusinessMetrics {
  /** Días cubiertos por las métricas de negocio. */
  periodDays: number;
  /** Entradas cobradas (buy-in + re-entradas) en el periodo. */
  revenue: number;
  /** Comisión del club (fee por jugador + adminFee) en el periodo. */
  rake: number;
  /** Dinero destinado a premios (revenue - rake). */
  prizePool: number;
  /** Entrada media por jugador. */
  averageTicket: number;
  /** Jugadores distintos en el periodo. */
  totalPlayers: number;
  /** Entradas totales (jugadores + re-entradas). */
  totalEntries: number;
  /** Re-entradas realizadas en el periodo. */
  reEntries: number;
  /** Ocupación media de los torneos del periodo (%). */
  averageOccupancy: number;
  /** Serie de los últimos 7 días para el gráfico. */
  daily: ClubDailyMetric[];
  /** Mejores jugadores del periodo. */
  topPlayers: ClubTopPlayer[];
}

/** Métricas del dashboard del club. */
export interface ClubStats extends ClubBusinessMetrics {
  clubId: number;
  /** Rol del usuario autenticado dentro del club. */
  myRole: ClubMemberRole;
  members: number;
  collaborators: number;
  pendingMembers: number;
  pendingInvitations: number;
  /** Invitaciones pendientes ya caducadas. */
  expiredInvitations: number;
  tournaments: number;
  activeTournaments: number;
  /** Torneos programados en los próximos 7 días. */
  upcomingTournaments: number;
  tables: number;
  openTables: number;
}

/** Acciones auditables dentro de un club. */
export type ClubAuditAction =
  | 'club.updated'
  | 'club.code_rotated'
  | 'club.ownership_transferred'
  | 'collaborator.role_changed'
  | 'collaborator.removed'
  | 'member.status_changed'
  | 'invitation.created'
  | 'invitation.resent'
  | 'invitation.revoked'
  | 'invitation.accepted'
  | 'invitation.expired'
  | 'cash.movement_created'
  | 'cash.movement_updated'
  | 'cash.movement_deleted'
  | 'cash.collected'
  | 'cash.payout_registered';

/** Entrada del historial de acciones sensibles del club. */
export interface ClubAuditLog {
  id: number;
  clubId: number;
  actorUserId: number | null;
  /** Nombre del actor en el momento de la acción (`Sistema` si fue automático). */
  actorName: string | null;
  action: ClubAuditAction;
  targetType: string | null;
  targetId: number | null;
  /** Frase lista para mostrar en el historial. */
  summary: string | null;
  metadata: Record<string, unknown> | null;
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
  currency: Currency;
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
  mode: GameMode;
  currency: Currency;
  buyIn: number;
  fee: number;
  startingStack: number;
  maxPlayers: number | null;
  /** Conteos calculados a partir de las reservas del torneo. */
  reservedCount?: number;
  playersCount?: number;
  playingCount?: number;
  /** Dinero de los add-ons del torneo según la caja (0 si no tiene). */
  addOnsAmount?: number;
  registrationOpen: boolean;
  tableCount: number;
  reEntryEnabled: boolean;
  maxReEntries: number | null;
  reEntryUntilLevel: number | null;
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
  clubId?: number | null;
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
  mode?: GameMode;
  currency?: Currency;
  notes?: string;
  isActive?: boolean;
  clubId?: number | null;
}

export interface TournamentPayload {
  name: string;
  gameTypeId: number | null;
  startDate: string;
  status?: TournamentStatus;
  mode?: GameMode;
  currency?: Currency;
  buyIn: number;
  fee?: number;
  startingStack: number;
  maxPlayers?: number | null;
  registrationOpen?: boolean;
  tableCount?: number;
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
  clubId?: number | null;
  blindConfig: BlindConfig;
  /** Estructura manual (si el usuario la genero/edito en el formulario). Si se omite, el backend la regenera desde blindConfig. */
  blindStructure?: BlindStructureItem[] | null;
}

export type ReservationStatus =
  'pending' | 'accepted' | 'rejected' | 'stood_up' | 'eliminated';

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
  /** Mesa asignada (1..tableCount) y asiento (1..9). Null = sin asignar. */
  tableNumber: number | null;
  seatNumber: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TableReservation {
  id: number;
  tableId: number;
  userId: number;
  user: User;
  status: 'pending' | 'confirmed' | 'cancelled';
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

// ---- Caja y recaudación del club ----

/** Tipo de movimiento de caja. */
export type ClubCashMovementType =
  | 'entry'
  | 're_entry'
  | 'add_on'
  | 'prize'
  | 'expense'
  | 'withdrawal'
  | 'deposit'
  | 'adjustment';

/** Dirección del movimiento: dinero que entra o que sale. */
export type ClubCashDirection = 'in' | 'out';

/** Estado del movimiento: pendiente, cobrado/pagado o anulado. */
export type ClubCashStatus = 'pending' | 'paid' | 'void';

/** Forma de pago con la que se cobró o pagó. */
export type ClubCashMethod = 'cash' | 'card' | 'transfer' | 'other';

/** Movimiento del libro de caja del club. */
export interface ClubCashMovement {
  id: number;
  clubId: number;
  tournamentId: number | null;
  tournament?: { id: number; name: string; startDate: string } | null;
  userId: number | null;
  user?: { id: number; name: string; email: string } | null;
  reservationId: number | null;
  type: ClubCashMovementType;
  direction: ClubCashDirection;
  status: ClubCashStatus;
  method: ClubCashMethod;
  amount: number;
  /** Comisión del club incluida en el importe. */
  feeAmount: number | null;
  currency: string;
  place: number | null;
  note: string | null;
  occurredAt: string;
  paidAt: string | null;
  createdByUserId: number | null;
  settledByUserId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClubCashTypeBreakdown {
  type: ClubCashMovementType;
  direction: ClubCashDirection;
  count: number;
  amount: number;
  pending: number;
}

export interface ClubCashMethodBreakdown {
  method: ClubCashMethod;
  count: number;
  amount: number;
}

export interface ClubCashDailyPoint {
  date: string;
  in: number;
  out: number;
  net: number;
}

/** Resumen de recaudación del club en un periodo. */
export interface ClubCashSummary {
  clubId: number;
  from: string;
  to: string;
  periodDays: number;
  currency: string;
  /** Saldo histórico de caja (todo lo cobrado menos lo pagado). */
  balance: number;
  collected: number;
  paidOut: number;
  net: number;
  pendingIn: number;
  pendingOut: number;
  commission: number;
  prizePot: number;
  entries: number;
  reEntries: number;
  addOns: number;
  pendingCount: number;
  paidCount: number;
  players: number;
  tournaments: number;
  averageTicket: number;
  /** Reservas del periodo todavía sin movimiento de caja. */
  unregistered: number;
  byType: ClubCashTypeBreakdown[];
  byMethod: ClubCashMethodBreakdown[];
  daily: ClubCashDailyPoint[];
}

/** Consolidado de caja de un torneo. */
export interface ClubCashTournament {
  tournamentId: number;
  name: string;
  status: TournamentStatus;
  startDate: string;
  currency: string;
  buyIn: number;
  fee: number;
  addOnAmount: number | null;
  players: number;
  entries: number;
  reEntries: number;
  addOns: number;
  expected: number;
  unregistered: number;
  collected: number;
  pending: number;
  /** Dinero por cobrar del torneo (entradas, re-entradas y add-ons pendientes). */
  pendingIn: number;
  /** Dinero por pagar del torneo (premios/gastos pendientes de pago). */
  pendingOut: number;
  voided: number;
  prizesPaid: number;
  expenses: number;
  net: number;
  commission: number;
  prizePot: number;
  collectedCount: number;
  pendingCount: number;
  unpaidPlayers: number;
}

/** Lo que ha invertido y ganado un jugador en un torneo. */
export interface ClubCashTournamentPlayer {
  userId: number;
  name: string;
  email: string;
  reservationStatus: ReservationStatus | null;
  tableNumber: number | null;
  seatNumber: number | null;
  entries: number;
  reEntries: number;
  addOns: number;
  invested: number;
  paid: number;
  pending: number;
  prizes: number;
  net: number;
}

export interface ClubCashTournamentDetail {
  tournament: {
    id: number;
    name: string;
    status: TournamentStatus;
    startDate: string;
    currency: string;
    buyIn: number;
    fee: number;
    addOnEnabled: boolean;
    addOnAmount: number | null;
    maxPlayers: number | null;
    tableCount: number;
  };
  summary: ClubCashTournament;
  players: ClubCashTournamentPlayer[];
  movements: ClubCashMovement[];
}

/** Ranking de lo que ha invertido un jugador en el club. */
export interface ClubCashPlayer {
  userId: number;
  name: string;
  email: string;
  tournaments: number;
  entries: number;
  reEntries: number;
  addOns: number;
  invested: number;
  paid: number;
  pending: number;
  prizes: number;
  net: number;
  lastMovementAt: string | null;
}

export interface ClubCashPlayerDetail {
  player: ClubCashPlayer;
  byTournament: {
    tournamentId: number;
    name: string;
    startDate: string;
    entries: number;
    reEntries: number;
    addOns: number;
    invested: number;
    paid: number;
    pending: number;
    prizes: number;
    net: number;
  }[];
  movements: ClubCashMovement[];
}

export interface ClubCashTotals {
  collected: number;
  paidOut: number;
  net: number;
  pendingIn: number;
  pendingOut: number;
}

export interface ClubCashMovementPage extends Paginated<ClubCashMovement> {
  totals: ClubCashTotals;
}
