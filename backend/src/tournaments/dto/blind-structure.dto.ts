import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { AnteModeValues, BlindGrowthValues } from '../types/blind-structure';

export class GenerateStructureDto {
  @IsInt()
  @Min(1)
  startingStack: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  startingBigBlind?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  levelDurationMin?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  numberOfLevels?: number;

  @IsOptional()
  @IsIn(BlindGrowthValues)
  growth?: string;

  @IsOptional()
  @IsIn(AnteModeValues)
  anteMode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  anteStartLevel?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  breakEveryLevels?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  breakDurationMin?: number;
}

export class BlindStructureItemDto {
  @IsIn(['level', 'break'])
  type: 'level' | 'break';

  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  smallBlind?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  bigBlind?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ante?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMin?: number;
}