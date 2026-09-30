import { SetMetadata } from '@nestjs/common';
import type { ClubMemberRole } from '../../modules/clubs/entities/club-member.entity';
import type { ClubResourceType } from '../../modules/clubs/clubs.service';

export const CLUB_ROLES_KEY = 'clubRoles';

export interface ClubRolesOptions {
  /** Rol mínimo exigido dentro del club. */
  role: ClubMemberRole;
  /**
   * Recurso del que deducir el club cuando la ruta no recibe `clubId`
   * (p. ej. `PATCH /tournaments/:id` → `resource: 'tournament'`).
   */
  resource?: ClubResourceType;
}

/**
 * Exige un rol mínimo dentro del club implicado en la petición.
 *
 * El club se deduce, por orden, de:
 *   1. `:clubId` en params/body/query,
 *   2. `:id` de una ruta que empieza por `/clubs`,
 *   3. el club del recurso indicado en `resource` (`tournament`/`table`).
 *
 * El admin global del sistema (rol `admin`) siempre pasa; los roles del club son
 * jerárquicos: admin > operador > cajero > miembro.
 *
 * Uso: `@ClubRoles(ClubMemberRole.OPERATOR, { resource: 'tournament' })`.
 */
export const ClubRoles = (role: ClubMemberRole, options: Omit<ClubRolesOptions, 'role'> = {}) =>
  SetMetadata(CLUB_ROLES_KEY, { role, ...options } satisfies ClubRolesOptions);
