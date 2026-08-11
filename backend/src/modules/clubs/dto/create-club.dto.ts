import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateClubDto {
  @IsString()
  @IsNotEmpty({ message: 'Club name is required' })
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  /** Admin del club. Si se omite, queda como admin quien lo crea. */
  @IsOptional()
  @IsInt()
  @Min(1)
  adminUserId?: number;
}
