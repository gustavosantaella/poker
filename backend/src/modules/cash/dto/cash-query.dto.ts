import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  ClubCashMovementStatus,
  ClubCashMovementType,
  ClubCashPaymentMethod,
} from '../entities/club-cash-movement.entity';

/** Fecha `YYYY-MM-DD` (los filtros de periodo se resuelven en hora local). */
export const CASH_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Filtros del módulo de recaudación. Todos son opcionales:
 * - `from`/`to` acotan el periodo (por defecto, últimos 30 días).
 * - `tournamentId`/`userId` acotan a un torneo o a un jugador.
 * - `type`/`status`/`method` filtran el libro de caja.
 */
export class CashQueryDto extends PaginationDto {
  @IsOptional()
  @Matches(CASH_DATE_PATTERN, { message: 'from must be a YYYY-MM-DD date' })
  from?: string;

  @IsOptional()
  @Matches(CASH_DATE_PATTERN, { message: 'to must be a YYYY-MM-DD date' })
  to?: string;

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
  @IsIn(Object.values(ClubCashMovementType))
  type?: ClubCashMovementType;

  @IsOptional()
  @IsIn(Object.values(ClubCashMovementStatus))
  status?: ClubCashMovementStatus;

  @IsOptional()
  @IsIn(Object.values(ClubCashPaymentMethod))
  method?: ClubCashPaymentMethod;

  /** Texto libre para buscar en la nota o en el nombre del jugador. */
  @IsOptional()
  @IsString()
  search?: string;
}
