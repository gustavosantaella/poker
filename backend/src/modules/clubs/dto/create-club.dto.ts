import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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

  /** Coordenadas del club (opcionales; el admin puede usar la ubicación actual). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  /** Redes sociales (opcionales). */
  @IsOptional()
  @IsString()
  @MaxLength(180)
  instagram?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  facebook?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  whatsapp?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string | null;

  /** Admin del club. Si se omite, queda como admin quien lo crea. */
  @IsOptional()
  @IsInt()
  @Min(1)
  adminUserId?: number;
}
