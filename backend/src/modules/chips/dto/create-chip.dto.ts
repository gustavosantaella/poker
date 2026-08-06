import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateChipDto {
  @IsInt()
  @Min(1, { message: 'Value must be a positive number' })
  value: number;

  @IsString()
  @IsNotEmpty({ message: 'Color name is required' })
  @MaxLength(50)
  color: string;

  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'hexColor must be a valid hex color like #FF0000' })
  hexColor: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
