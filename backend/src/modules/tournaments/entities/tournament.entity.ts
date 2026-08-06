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

  @Column({ default: true })
  registrationOpen: boolean;

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

  @Column({ default: true })
  isActive: boolean;
}