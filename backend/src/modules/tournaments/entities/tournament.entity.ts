import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { DEFAULT_CURRENCY } from '../../../common/constants/currencies';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DecimalTransformer } from '../../../common/entities/decimal.transformer';
import { GameType } from '../../game-types/entities/game-type.entity';
import { BlindConfig, BlindStructureItem } from '../types/blind-structure';

export enum TournamentStatus {
  SCHEDULED = 'scheduled',
  REGISTERING = 'registering',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TournamentMode {
  LIVE = 'live',
  ONLINE = 'online',
}

@Entity('tournaments')
export class Tournament extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @ManyToOne(() => GameType, { eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'game_type_id' })
  gameType: GameType | null;

  @Column({ name: 'game_type_id', type: 'int', nullable: true })
  gameTypeId: number | null;

  @Column({ type: 'timestamp' })
  startDate: Date;
  @Column({ type: 'enum', enum: TournamentStatus, default: TournamentStatus.SCHEDULED })
  status: TournamentStatus;

  @Column({ type: 'enum', enum: TournamentMode, default: TournamentMode.LIVE })
  mode: TournamentMode;

  @Column({ type: 'varchar', length: 3, default: DEFAULT_CURRENCY })
  currency: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: DecimalTransformer })
  buyIn: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: DecimalTransformer, default: 0 })
  fee: number;

  @Column({ type: 'int' })
  startingStack: number;

  @Column({ type: 'int', nullable: true })
  maxPlayers: number | null;

  @Column({ type: 'int', default: 0 })
  currentPlayers: number = 0;

  @Column({ type: 'int', default: 0 })
  currentReEntries: number = 0;

  @Column({ type: 'int', default: 0 })
  currentAddOns: number = 0;

  @Column({ type: 'int', default: 0 })
  reservedPlayers: number = 0;

  @Column({ default: true })
  registrationOpen: boolean;


  @Column({ type: 'int', default: 0 })
  currentDayTournament: number = 0;

  // Re-entry (rebuy)
  @Column({ default: false })
  reEntryEnabled: boolean;

  @Column({ type: 'int', nullable: true })
  maxReEntries: number | null;

  /** Nivel hasta el que se permite la re-compra (null = hasta el cierre de inscripción). */
  @Column({ type: 'int', nullable: true })
  reEntryUntilLevel: number | null;

  // Late registration
  @Column({ default: false })
  lateRegistrationEnabled: boolean;

  @Column({ type: 'int', nullable: true })
  lateRegistrationUntilLevel: number | null;

  // Add-on
  @Column({ default: false })
  addOnEnabled: boolean;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: DecimalTransformer, nullable: true })
  addOnAmount: number | null;

  @Column({ type: 'int', nullable: true })
  addOnStack: number | null;

  @Column({ type: 'int', nullable: true })
  addOnUntilLevel: number | null;

  @Column({ type: 'json', nullable: true })
  blindStructure: BlindStructureItem[] | null;

  @Column({ type: 'json', nullable: true })
  blindConfig: BlindConfig | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: DecimalTransformer, nullable: true })
  guaranteedPrize: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  paidPlacesType: 'percent' | 'fixed' | null;

  @Column({ type: 'int', nullable: true })
  paidPlacesValue: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  adminFeeType: 'percent' | 'fixed' | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: DecimalTransformer, nullable: true })
  adminFeeValue: number | null;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  currentLevel: number | null;

  @Column({ type: 'timestamp', nullable: true })
  levelStartedAt: Date | null;

  /**
   * Reservas sin aceptar: pidieron plaza y todavía no han entrado (no pagaron).
   * Calculado a partir de tournament_reservations, no persistido.
   */
  reservedCount?: number;

  /**
   * Jugadores que entraron al torneo (jugando, levantados o eliminados).
   * Calculado a partir de tournament_reservations, no persistido.
   */
  playersCount?: number;

  /** Jugadores que siguen en juego ahora mismo (calculado, no persistido). */
  playingCount?: number;

  /**
   * Dinero de los add-ons del torneo (calculado, no persistido).
   *
   * Los add-ons no viven en las reservas: se cobran como movimiento de caja
   * (`add_on`), así que el importe sale del libro de caja y excluye los anulados.
   */
  addOnsAmount?: number;

  /**
   * Add-ons cobrados en el torneo, contando todos los movimientos de caja
   * (calculado, no persistido). Si un jugador repite, suma más de uno.
   */
  addOnsCount?: number;

  /**
   * Jugadores distintos que hicieron add-on en el torneo (calculado, no
   * persistido). Quien repite add-on cuenta una sola vez.
   */
  addOnsPlayersCount?: number;

  @Column({ type: 'int', default: 1 })
  tableCount: number = 1;

  @Column({ default: true })
  isActive: boolean;

  /** Club al que pertenece el torneo (opcional). */
  @Column({ name: 'club_id', type: 'int', nullable: true })
  clubId: number | null;

  /** Usuario que creó el torneo. */
  @Column({ name: 'created_by_user_id', type: 'int', nullable: true })
  createdByUserId: number | null;
}