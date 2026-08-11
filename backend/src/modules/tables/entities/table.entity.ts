import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { DEFAULT_CURRENCY } from '../../../common/constants/currencies';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DecimalTransformer } from '../../../common/entities/decimal.transformer';
import { GameType } from '../../game-types/entities/game-type.entity';

export enum TableStatus {
  OPEN = 'open',
  RUNNING = 'running',
  PAUSED = 'paused',
  CLOSED = 'closed',
}

export enum TableMode {
  LIVE = 'live',
  ONLINE = 'online',
}

@Entity('tables')
export class PokerTable extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @ManyToOne(() => GameType, { eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'game_type_id' })
  gameType: GameType | null;

  @Column({ name: 'game_type_id', type: 'int', nullable: true })
  gameTypeId: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: DecimalTransformer })
  smallBlind: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: DecimalTransformer })
  bigBlind: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: DecimalTransformer })
  minBuyIn: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: DecimalTransformer })
  maxBuyIn: number;

  @Column({ type: 'int', default: 9 })
  seats: number;

  @Column({ type: 'enum', enum: TableStatus, default: TableStatus.OPEN })
  status: TableStatus;

  @Column({ type: 'enum', enum: TableMode, default: TableMode.LIVE })
  mode: TableMode;

  @Column({ type: 'varchar', length: 3, default: DEFAULT_CURRENCY })
  currency: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ default: true })
  isActive: boolean;

  /** Club al que pertenece la mesa (opcional). */
  @Column({ name: 'club_id', type: 'int', nullable: true })
  clubId: number | null;

  /** Tiempo de pensamiento por jugador (segundos). */
  @Column({ type: 'int', default: 30 })
  actionTimeSec: number = 30;

  /** Usuario que creó la mesa. */
  @Column({ name: 'created_by_user_id', type: 'int', nullable: true })
  createdByUserId: number | null;
}