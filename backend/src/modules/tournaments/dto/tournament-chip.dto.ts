import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateTournamentChipDto {
  @IsInt()
  @Min(1)
  chipId: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  discardLevel?: number;
}