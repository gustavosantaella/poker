import { IsInt, IsOptional, Min } from 'class-validator';

export class StandUpPlayerDto {
  /** Id de la reserva del torneo (mesa de torneo). */
  @IsOptional()
  @IsInt()
  @Min(1)
  reservationId?: number;

  /** Id de la reserva de mesa cash. */
  @IsOptional()
  @IsInt()
  @Min(1)
  tableReservationId?: number;
}
