import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateGameTypeDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'holeCards must be at least 1' })
  @Max(10)
  holeCards?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  communityCards?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
