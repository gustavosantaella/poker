import { IsInt, Min } from 'class-validator';

export class CreateTableReservationDto {
  @IsInt()
  @Min(1)
  userId: number;
}
