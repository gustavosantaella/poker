import { IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CURRENCIES } from '../../../common/constants/currencies';
import { TableMode, TableStatus } from '../entities/table.entity';

export class CreateTableDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100)
  name: string;

  @IsInt()
  @Min(1)
  gameTypeId: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Small blind must be a valid number' })
  @Min(0)
  smallBlind: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Big blind must be a valid number' })
  @Min(0)
  bigBlind: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minBuyIn: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxBuyIn: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  seats?: number;

  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;

  @IsOptional()
  @IsEnum(TableMode)
  mode?: TableMode;

  @IsOptional()
  @IsIn([...CURRENCIES], { message: 'currency must be one of: USD, VES, EUR' })
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  clubId?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(600)
  actionTimeSec?: number;
}
