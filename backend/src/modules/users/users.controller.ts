import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { User, UserRole } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('admin/profile')
  getAdminProfile() {
    return this.usersService.getAdminProfile();
  }

  /** Solo admin: listado de usuarios (el player no puede ver a los demás). */
  @Roles(UserRole.ADMIN)
  @Get()
  findAll(@Query() pagination: PaginationDto, @Query('role') role?: UserRole) {
    // Filtro por rol (p. ej. el player lista Clubs) y nunca exponer datos sensibles.
    return this.usersService
      .findAll({ ...pagination, where: role ? { role } : undefined, order: { createdAt: 'ASC' } })
      .then((result) => ({ ...result, items: result.items.map((u) => this.usersService.toSafeUser(u)) }));
  }

  /** Solo admin: detalle de cualquier usuario. */
  @Roles(UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  /** Solo admin: editar cualquier usuario (cambiar rol, desactivar, etc.). */
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  /** Solo admin: eliminar usuarios. */
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  /** Cualquier usuario autenticado: editar su propio perfil. */
  @Patch('me/profile')
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user.id, dto).then((u) => this.usersService.toSafeUser(u));
  }
}
