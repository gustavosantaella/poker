import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ClubCashDirection,
  ClubCashMovementStatus,
  ClubCashMovementType,
  ClubCashPaymentMethod,
} from '../entities/club-cash-movement.entity';
import { CASH_DATE_PATTERN } from './cash-query.dto';

/**
 * Movimiento de caja registrado a mano por el equipo del club (cobro de un
 * add-on, premio, gasto, retirada, ajuste...). Los movimientos de entrada y
 * re-entrada suelen generarse solos al sincronizar las reservas.
 */
export class CreateCashMovementDto {
  @IsIn(Object.values(ClubCashMovementType))
  type: ClubCashMovementType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsIn(Object.values(ClubCashPaymentMethod))
  method?: ClubCashPaymentMethod;

  /** Solo para ajustes: fuerza si el dinero entra o sale. */
  @IsOptional()
  @IsIn(Object.values(ClubCashDirection))
  direction?: ClubCashDirection;

  /** Estado inicial. Por defecto `paid`: un movimiento manual ya ocurrió. */
  @IsOptional()
  @IsIn(Object.values(ClubCashMovementStatus))
  status?: ClubCashMovementStatus;

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

  /** Puesto del premio (solo tipo `prize`). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  place?: number;

  /** Parte del importe que es comisión del club (informativo). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  feeAmount?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  /** Fecha del movimiento (`YYYY-MM-DD`). Por defecto, hoy. */
  @IsOptional()
  @Matches(CASH_DATE_PATTERN, { message: 'occurredAt must be a YYYY-MM-DD date' })
  occurredAt?: string;
}

/** Edición de un movimiento existente: estado, forma de pago, importe o nota. */
export class UpdateCashMovementDto {
  @IsOptional()
  @IsIn([ClubCashMovementStatus.PENDING, ClubCashMovementStatus.PAID, ClubCashMovementStatus.VOID])
  status?: ClubCashMovementStatus;

  @IsOptional()
  @IsIn(Object.values(ClubCashPaymentMethod))
  method?: ClubCashPaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  /** Solo el administrador del club puede cambiar el importe. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  feeAmount?: number;
}
