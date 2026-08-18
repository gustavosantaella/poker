import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { CreateTableReservationDto } from './dto/create-table-reservation.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('tables')
export class TablesController {
  constructor(private readonly service: TablesService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto, @Query('clubId') clubId?: number) {
    return this.service.findAll({
      ...pagination,
      where: clubId ? { clubId } : undefined,
      order: { createdAt: 'DESC' },
    });
  }

  @Get('my-reservations')
  myReservations(@CurrentUser() user: User) {
    return this.service.myReservations(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateTableDto, @CurrentUser() user: User) {
    return this.service.create({ ...dto, createdByUserId: user.id });
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTableDto) {
    return this.service.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // ---- Reservas de mesa ----

  /** Un player solo puede reservar para sí mismo; el admin para cualquier jugador. */
  @Post(':id/reservations')
  createReservation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTableReservationDto,
    @CurrentUser() user: User,
  ) {
    const userId = user.role === UserRole.PLAYER ? user.id : dto.userId;
    return this.service.createReservation(id, { ...dto, userId });
  }

  @Get(':id/reservations')
  listReservations(@Param('id', ParseIntPipe) id: number) {
    return this.service.listReservations(id);
  }

  @Delete(':id/reservations/:reservationId')
  removeReservation(
    @Param('id', ParseIntPipe) id: number,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @CurrentUser() user: User,
  ) {
    return this.service.removeReservation(id, reservationId, { userId: user.id, role: user.role });
  }
}