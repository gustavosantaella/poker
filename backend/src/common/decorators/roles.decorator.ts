import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Restringe el acceso a los roles indicados.
 * Uso: @Roles(UserRole.ADMIN) en controlador o método.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
