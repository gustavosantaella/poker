import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(72, { message: 'Password must be at most 72 characters long' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(120)
  name: string;
  @IsOptional()
  @IsString()
  @MaxLength(60)
  alias?: string;

  /**
   * Código de invitación opcional. Si coincide con ADMIN_INVITE_CODE del backend,
   * la cuenta se crea con rol admin. Sin él, el rol SIEMPRE es player: un usuario
   * nunca puede auto-asignarse un rol desde el cliente.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  inviteCode?: string;
}
