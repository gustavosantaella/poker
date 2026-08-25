import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Cuerpo opcional de POST /api/account/request-delete.
 *
 * El email permite identificar la cuenta cuando el usuario no puede iniciar
 * sesión (por ejemplo, si olvidó la contraseña). Si el usuario sí está logueado,
 * el email se obtiene del token JWT aunque no se envíe en el cuerpo.
 */
export class RequestDeletionDto {
  /** Email asociado a la cuenta cuya eliminación se solicita. */
  @IsOptional()
  @IsEmail({}, { message: 'A valid email is required' })
  @MaxLength(255)
  email?: string;

  /** Motivo opcional de la solicitud de borrado. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
