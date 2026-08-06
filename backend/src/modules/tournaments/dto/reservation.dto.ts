import { IsIn, IsInt, Min } from 'class-validator';
import { ReservationStatus } from '../entities/tournament-reservation.entity';

export class CreateReservationDto {
  @IsInt()
  @Min(1)
  userId: number;
}

export class UpdateReservationDto {
  @IsIn(['pending', 'accepted', 'rejected'])
  status: ReservationStatus;
}