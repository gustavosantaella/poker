import { IsInt, IsOptional, Min } from 'class-validator';

export class AssignDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  tournamentId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  tableId?: number;

  /** Número de mesa dentro del torneo (1..tableCount). */
  @IsOptional()
  @IsInt()
  @Min(1)
  tableNumber?: number;
}
