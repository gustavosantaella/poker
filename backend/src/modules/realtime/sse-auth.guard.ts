import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

/**
 * Autenticación para endpoints SSE: acepta el token Bearer en el header
 * Authorization o en el query param `?token=` (necesario para clientes que no
 * pueden fijar headers, p. ej. EventSource en navegadores).
 */
@Injectable()
export class SseAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization: string | undefined = request.headers?.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : (request.query?.token as string | undefined);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.usersService.findOne(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException();
      }
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
