import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('admin/profile')
  getAdminProfile() {
    return this.usersService.getAdminProfile();
  }

  @Get()
  findAll(@Query() pagination: PaginationDto, @Query('role') role?: UserRole) {
    // Filtro por rol (p. ej. el player lista Clubs) y nunca exponer datos sensibles.
    return this.usersService
      .findAll({ ...pagination, where: role ? { role } : undefined, order: { createdAt: 'ASC' } })
      .then((result) => ({ ...result, items: result.items.map((u) => this.usersService.toSafeUser(u)) }));
  }

  /** Crea un usuario desde el panel admin (colaboradores/dealers del club). */
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto).then((u) => this.usersService.toSafeUser(u));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Patch('me/profile')
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user.id, dto).then((u) => this.usersService.toSafeUser(u));
  }
}
