import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ClubCashDirection,
  ClubCashMovementStatus,
  ClubCashPaymentMethod,
} from '../entities/club-cash-movement.entity';

/**
 * Marca en bloque el estado de cobro/pago de movimientos pendientes:
 * - `movementIds`: movimientos concretos (cobrar la entrada de un jugador).
 * - `tournamentId`: todos los pendientes de un torneo ("cobrar todo").
 * - `userId`: todos los pendientes de un jugador (en todo el club o un torneo).
 */
export class SettleCashMovementsDto {
  @IsIn([ClubCashMovementStatus.PAID, ClubCashMovementStatus.PENDING])
  status: ClubCashMovementStatus;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  movementIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tournamentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @IsIn(Object.values(ClubCashPaymentMethod))
  method?: ClubCashPaymentMethod;

  /**
   * Limita la operación al dinero que entra (`in`) o al que sale (`out`). La app
   * lo usa para "cobrar todo" un torneo sin tocar los premios pendientes de pago.
   */
  @IsOptional()
  @IsIn(Object.values(ClubCashDirection))
  direction?: ClubCashDirection;
}

/** Premio asignado a un jugador en un puesto concreto del torneo. */
export class CashPayoutItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9999)
  place: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @IsOptional()
  @IsIn(Object.values(ClubCashPaymentMethod))
  method?: ClubCashPaymentMethod;
}

/** Registro de los premios pagados de un torneo (uno por puesto). */
export class RegisterPayoutsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CashPayoutItemDto)
  payouts: CashPayoutItemDto[];
}

/**
 * Reconciliación de las reservas del club con el libro de caja.
 *
 * Las entradas y re-entradas de los jugadores que están en el torneo se anotan
 * **cobradas** (el cobro se hace al registrar al jugador); no hay que pedirlo.
 */
export class SyncCashDto {
  /** Limita la sincronización a un torneo (por defecto, todo el club). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tournamentId?: number;

  /** Forma de pago con la que se anotan los cobros nuevos (por defecto, efectivo). */
  @IsOptional()
  @IsIn(Object.values(ClubCashPaymentMethod))
  method?: ClubCashPaymentMethod;
}
