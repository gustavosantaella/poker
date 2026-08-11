import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { DealerService } from './dealer.service';
import { AssignDto } from './dto/assign.dto';
import { StandUpPlayerDto } from './dto/stand-up-player.dto';

@Controller('dealer')
export class DealerController {
  constructor(private readonly service: DealerService) {}

  @Get('context')
  context(@CurrentUser() user: User) {
    return this.service.context(user.id);
  }

  @Post('assign')
  assign(@CurrentUser() user: User, @Body() dto: AssignDto) {
    return this.service.assign(user.id, dto);
  }

  @Get('assignment')
  current(@CurrentUser() user: User) {
    return this.service.current(user.id);
  }

  @Post('assignment/complete')
  complete(@CurrentUser() user: User) {
    return this.service.complete(user.id);
  }

  @Post('stand-up-player')
  standUpPlayer(@CurrentUser() user: User, @Body() dto: StandUpPlayerDto) {
    return this.service.standUpPlayer(user.id, dto);
  }
}
