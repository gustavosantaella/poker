import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
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

@Entity('tournaments')
export class Tournament extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @ManyToOne(() => GameType, { eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'game_type_id' })
  gameType: GameType | null;

  @Column({ name: 'game_type_id', type: 'int', nullable: true })
  gameTypeId: number | null;

  @Column({ type: 'datetime' })
  startDate: Date;

  @Column({ type: 'enum', enum: TournamentStatus, default: TournamentStatus.SCHEDULED })
  status: TournamentStatus;

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

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  currentLevel: number | null;

  @Column({ type: 'datetime', nullable: true })
  levelStartedAt: Date | null;

  /** Total de reservas (calculado a partir de tournament_reservations, no persistido). */
  reservedCount?: number;

  /** Total de jugadores aceptados (calculado a partir de tournament_reservations, no persistido). */
  playersCount?: number;

  @Column({ default: true })
  isActive: boolean;
}