import { Body, Controller, Delete, Headers, HttpCode, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { AccountService } from './account.service';
import { RequestDeletionDto } from './dto/request-deletion.dto';

/**
 * Autoservicio de cuenta.
 *
 * - POST /api/account/request-delete: registra una solicitud de borrado de
 *   cuenta y datos (público, con o sin sesión).
 * - DELETE /api/account/delete: elimina la cuenta del usuario autenticado
 *   (player o admin) junto con todos sus datos asociados (reservas, membresías
 *   de clubes y los clubes que administra). La advertencia/confirmación se
 *   muestra en el cliente antes de invocar este endpoint.
 */
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /**
   * Solicitud de borrado de cuenta/datos. Se guarda en `events` con
   * type='request-delete'. Si el cliente envía un Bearer token válido se asocia
   * el user_id; si no, user_id queda en null.
   */
  @Post('request-delete')
  @Public()
  @HttpCode(200)
  requestDelete(
    @Body() dto: RequestDeletionDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.accountService.requestDeletion(authorization, dto);
  }

  @Delete('delete')
  @HttpCode(200)
  delete(@CurrentUser() user: User) {
    return this.accountService.deleteAccount(user);
  }
}
