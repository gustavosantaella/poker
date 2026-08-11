import { IsString, Matches } from 'class-validator';

export class JoinClubDto {
  /** Código numérico de 6 dígitos del club. */
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit number' })
  code: string;
}
