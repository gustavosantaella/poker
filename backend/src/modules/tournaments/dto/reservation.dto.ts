import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ReservationStatus } from '../entities/tournament-reservation.entity';

export class CreateReservationDto {
  @IsInt()
  @Min(1)
  userId: number;
}

export class UpdateReservationDto {
  @IsIn(['pending', 'accepted', 'rejected'])
  status: ReservationStatus;

  /** Stack inicial del jugador (fichas). Si se omite al aceptar, usa el startingStack del torneo. */
  @IsOptional()
  @IsInt()
  @Min(1)
  stack?: number;

  /** Mesa asignada manualmente (1..tableCount). Si se omite, se asigna automáticamente. */
  @IsOptional()
  @IsInt()
  @Min(1)
  tableNumber?: number;

  /** Asiento asignado manualmente (1..9). Si se omite, se asigna automáticamente. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  seatNumber?: number;
}

export class RebuyDto {
  /** Stack con el que reentra el jugador. Si se omite, usa el startingStack del torneo. */
  @IsOptional()
  @IsInt()
  @Min(1)
  stack?: number;

  /** Mesa asignada manualmente (1..tableCount). Si se omite, se asigna automáticamente. */
  @IsOptional()
  @IsInt()
  @Min(1)
  tableNumber?: number;

  /** Asiento asignado manualmente (1..9). Si se omite, se asigna automáticamente. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  seatNumber?: number;
}