import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TournamentMode, TournamentStatus } from '../entities/tournament.entity';
import { BlindStructureItemDto, GenerateStructureDto } from './blind-structure.dto';

export class CreateTournamentDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100)
  name: string;

  @IsInt()
  @Min(1)
  gameTypeId: number;

  @IsDateString({}, { message: 'startDate must be a valid ISO date' })
  startDate: string;

  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;

  @IsOptional()
  @IsEnum(TournamentMode)
  mode?: TournamentMode;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'buyIn must be a valid number' })
  @Min(0)
  buyIn: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fee?: number;

  @IsInt()
  @Min(1)
  startingStack: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(1000)
  maxPlayers?: number | null;

  @IsOptional()
  @IsBoolean()
  registrationOpen?: boolean;

  // Re-entry (rebuy)
  @IsOptional()
  @IsBoolean()
  reEntryEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxReEntries?: number;

  // Late registration
  @IsOptional()
  @IsBoolean()
  lateRegistrationEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  lateRegistrationUntilLevel?: number;

  // Add-on
  @IsOptional()
  @IsBoolean()
  addOnEnabled?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  addOnAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  addOnStack?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  addOnUntilLevel?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  guaranteedPrize?: number;

  @IsOptional()
  @IsIn(['percent', 'fixed'])
  paidPlacesType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  paidPlacesValue?: number;

  @IsOptional()
  @IsIn(['percent', 'fixed'])
  adminFeeType?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  adminFeeValue?: number;

  // Blind structure (auto-generated from blindConfig, or fully manual)
  @IsOptional()
  @ValidateNested()
  @Type(() => GenerateStructureDto)
  blindConfig?: GenerateStructureDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlindStructureItemDto)
  blindStructure?: BlindStructureItemDto[];
}
