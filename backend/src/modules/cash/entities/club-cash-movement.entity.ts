import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { DEFAULT_CURRENCY } from '../../../common/constants/currencies';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DecimalTransformer } from '../../../common/entities/decimal.transformer';
import { Club } from '../../clubs/entities/club.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Naturaleza de un movimiento de caja.
 *
 * `entry`, `re_entry`, `add_on` y `deposit` son entradas de dinero; `prize`,
 * `expense` y `withdrawal` son salidas; `adjustment` puede ser cualquiera de las
 * dos (su dirección se indica explícitamente).
 */
export enum ClubCashMovementType {
  /** Inscripción/buy-in de un jugador. */
  ENTRY = 'entry',
  /** Recompra (re-entrada) de un jugador. */
  RE_ENTRY = 're_entry',
  /** Add-on comprado por un jugador. */
  ADD_ON = 'add_on',
  /** Premio entregado a un jugador. */
  PRIZE = 'prize',
  /** Gasto del club (personal, compras, torneos...). */
  EXPENSE = 'expense',
  /** Retirada de caja (el dinero sale del club). */
  WITHDRAWAL = 'withdrawal',
  /** Ingreso manual (fondo de caja, aporte, devolución...). */
  DEPOSIT = 'deposit',
  /** Ajuste (corrección de caja) en cualquier dirección. */
  ADJUSTMENT = 'adjustment',
}

/** Dirección del movimiento: dinero que entra o que sale. */
export enum ClubCashDirection {
  IN = 'in',
  OUT = 'out',
}

/**
 * Estado del movimiento:
 * - `pending`: cobro/pago pendiente (p. ej. una reserva aceptada sin cobrar).
 * - `paid`: el dinero ya entró o salió de la caja.
 * - `void`: anulado (se conserva como histórico, no cuenta en los totales).
 */
export enum ClubCashMovementStatus {
  PENDING = 'pending',
  PAID = 'paid',
  VOID = 'void',
}

/** Forma de pago con la que se cobró o pagó el movimiento. */
export enum ClubCashPaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
  OTHER = 'other',
}

/** Dirección por defecto de cada tipo de movimiento. */
export const CLUB_CASH_TYPE_DIRECTION: Record<
  ClubCashMovementType,
  ClubCashDirection
> = {
  [ClubCashMovementType.ENTRY]: ClubCashDirection.IN,
  [ClubCashMovementType.RE_ENTRY]: ClubCashDirection.IN,
  [ClubCashMovementType.ADD_ON]: ClubCashDirection.IN,
  [ClubCashMovementType.PRIZE]: ClubCashDirection.OUT,
  [ClubCashMovementType.EXPENSE]: ClubCashDirection.OUT,
  [ClubCashMovementType.WITHDRAWAL]: ClubCashDirection.OUT,
  [ClubCashMovementType.DEPOSIT]: ClubCashDirection.IN,
  [ClubCashMovementType.ADJUSTMENT]: ClubCashDirection.IN,
};

/** Tipos de movimiento que se generan automáticamente desde las reservas. */
export const CLUB_CASH_GENERATED_TYPES: ClubCashMovementType[] = [
  ClubCashMovementType.ENTRY,
  ClubCashMovementType.RE_ENTRY,
];

/** Nota que anota la sincronización al anular un cobro que ya no tiene reserva. */
export const CLUB_CASH_VOID_NOTE = 'Anulado: la entrada dejó de existir';

/**
 * Libro mayor de la caja de un club: TODOS los movimientos de dinero (entradas,
 * re-entradas, add-ons, premios, gastos, retiradas, ajustes).
 *
 * Es la fuente de verdad del módulo "Recaudado":
 * - Los movimientos generados desde las reservas llevan un `sourceKey`
 *   determinista (`entry:reservation:12`, `re_entry:reservation:12:2`,
 *   `prize:tournament:5:place:1`) cubierto por un índice único, de modo que
 *   sincronizar es idempotente y nunca duplica cobros.
 * - Los movimientos manuales (gastos, depósitos, ajustes...) no tienen `sourceKey`.
 * - `feeAmount` guarda la comisión del club incluida en el importe, para que el
 *   histórico no cambie si después se edita la configuración del torneo.
 */
@Entity('club_cash_movements')
@Index('UQ_club_cash_movements_source', ['sourceKey'], { unique: true })
@Index('IDX_club_cash_movements_club_date', ['clubId', 'occurredAt'])
@Index('IDX_club_cash_movements_tournament', ['tournamentId'])
@Index('IDX_club_cash_movements_user', ['userId'])
export class ClubCashMovement extends BaseEntity {
  @ManyToOne(() => Club, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'club_id' })
  club: Club;

  @Column({ name: 'club_id', type: 'int' })
  clubId: number;

  @ManyToOne(() => Tournament, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament | null;

  @Column({ name: 'tournament_id', type: 'int', nullable: true })
  tournamentId: number | null;

  @ManyToOne(() => User, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  /** Jugador implicado (entradas, re-entradas, add-ons y premios). */
  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  /** Reserva de la que se generó el movimiento (trazabilidad). */
  @Column({ name: 'reservation_id', type: 'int', nullable: true })
  reservationId: number | null;

  @Column({ type: 'enum', enum: ClubCashMovementType })
  type: ClubCashMovementType;

  @Column({ type: 'enum', enum: ClubCashDirection })
  direction: ClubCashDirection;

  @Column({
    type: 'enum',
    enum: ClubCashMovementStatus,
    default: ClubCashMovementStatus.PENDING,
  })
  status: ClubCashMovementStatus;

  @Column({
    type: 'enum',
    enum: ClubCashPaymentMethod,
    default: ClubCashPaymentMethod.CASH,
  })
  method: ClubCashPaymentMethod;

  /** Importe total del movimiento (incluye la comisión del club). */
  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    transformer: DecimalTransformer,
  })
  amount: number;

  /**
   * Comisión del club incluida en `amount` (fee de la entrada/re-entrada). Se
   * congela al registrar el movimiento para que el histórico sea fiable.
   */
  @Column({
    name: 'fee_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    transformer: DecimalTransformer,
    nullable: true,
  })
  feeAmount: number | null;

  @Column({ type: 'varchar', length: 3, default: DEFAULT_CURRENCY })
  currency: string;

  /** Puesto del premio (solo movimientos de tipo `prize`). */
  @Column({ type: 'int', nullable: true })
  place: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  /** Cuándo afecta el movimiento a la caja (por defecto, la fecha del torneo). */
  @Column({ name: 'occurred_at', type: 'datetime' })
  occurredAt: Date;

  /** Momento en que se confirmó el cobro/pago (null mientras está pendiente). */
  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt: Date | null;

  /** Usuario que registró el movimiento. */
  @Column({ name: 'created_by_user_id', type: 'int', nullable: true })
  createdByUserId: number | null;

  /** Usuario que confirmó el cobro/pago (cajero u operador). */
  @Column({ name: 'settled_by_user_id', type: 'int', nullable: true })
  settledByUserId: number | null;

  /**
   * Clave de origen del movimiento generado automáticamente (`null` en los
   * manuales). Garantiza que sincronizar no duplique cobros.
   */
  @Column({ name: 'source_key', type: 'varchar', length: 120, nullable: true })
  sourceKey: string | null;
}
