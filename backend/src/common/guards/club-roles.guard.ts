import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClubsService } from '../../modules/clubs/clubs.service';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { CLUB_ROLES_KEY, ClubRolesOptions } from '../decorators/club-roles.decorator';

/**
 * Guard global de permisos por club (se ejecuta después de `JwtAuthGuard` y
 * `RolesGuard`).
 *
 * - Sin `@ClubRoles()` el endpoint solo exige estar autenticado (comportamiento actual).
 * - Con `@ClubRoles(rol)` comprueba el rol del usuario DENTRO del club implicado,
 *   de forma que un admin de club, un operador o un cajero puedan gestionar su club
 *   sin ser administradores globales del sistema.
 */
@Injectable()
export class ClubRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly clubs: ClubsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<ClubRolesOptions>(CLUB_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as User | undefined;
    if (!user?.id) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }
    // El admin global del sistema gestiona cualquier club.
    if (user.role === UserRole.ADMIN) return true;

    const clubId = await this.resolveClubId(request, required);
    if (!clubId) {
      throw new ForbiddenException('This action requires a club');
    }
    await this.clubs.assertClubRank(clubId, user, required.role);
    return true;
  }

  /** Deduce el club implicado en la petición (ver `@ClubRoles`). */
  private async resolveClubId(request: any, required: ClubRolesOptions): Promise<number | null> {
    const toId = (value: unknown): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const id = Number(value);
      return Number.isInteger(id) && id > 0 ? id : null;
    };

    for (const source of [request.params, request.body, request.query]) {
      const id = toId(source?.clubId);
      if (id) return id;
    }

    // Rutas del tipo `/clubs/:id/...` reciben el club como `:id`. Se lee la ruta real
    // (`/api/clubs/7/stats`) porque `request.route.path` solo contiene el patrón
    // relativo al controlador (`/:id/stats`).
    const clubIdFromPath = this.clubIdFromPath(request);
    if (clubIdFromPath) return clubIdFromPath;

    if (required.resource) {
      const resourceId = toId(request.params?.id);
      if (resourceId) return this.clubs.resolveClubIdForResource(required.resource, resourceId);
    }

    return null;
  }

  /**
   * Extrae el id del club de rutas con el segmento `/clubs/:id` (incluido el prefijo
   * global `/api`). Devuelve `null` si la ruta no apunta a un club concreto.
   */
  private clubIdFromPath(request: any): number | null {
    const raw: string = request?.path ?? request?.url ?? '';
    const segments = raw.split('?')[0].split('/').filter(Boolean);
    const index = segments.lastIndexOf('clubs');
    if (index < 0) return null;
    const candidate = Number(segments[index + 1]);
    return Number.isInteger(candidate) && candidate > 0 ? candidate : null;
  }
}
