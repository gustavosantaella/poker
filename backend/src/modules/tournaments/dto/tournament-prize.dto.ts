import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, Min, ValidateNested } from 'class-validator';

export class PrizeItemDto {
  @IsInt()
  @Min(1)
  place: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;
}

export class UpdatePrizesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrizeItemDto)
  prizes: PrizeItemDto[];
}