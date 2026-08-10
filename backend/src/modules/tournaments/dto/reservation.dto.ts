import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
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
}

export class RebuyDto {
  /** Stack con el que reentra el jugador. Si se omite, usa el startingStack del torneo. */
  @IsOptional()
  @IsInt()
  @Min(1)
  stack?: number;
}