import { Controller, Delete, HttpCode } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AccountService } from './account.service';

/**
 * DELETE /api/account/delete
 *
 * Elimina la cuenta del usuario autenticado (player o admin) junto con todos
 * sus datos asociados (reservas, membresías de clubes y los clubes que
 * administra). La advertencia/confirmación se muestra en el cliente antes de
 * invocar este endpoint.
 */
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Delete('delete')
  @HttpCode(200)
  delete(@CurrentUser() user: User) {
    return this.accountService.deleteAccount(user);
  }
}
