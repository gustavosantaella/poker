import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { CreateTableReservationDto } from './dto/create-table-reservation.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('tables')
export class TablesController {
  constructor(private readonly service: TablesService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAll({ ...pagination, order: { createdAt: 'DESC' } });
  }

  @Get('my-reservations')
  myReservations(@CurrentUser() user: User) {
    return this.service.myReservations(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTableDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTableDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // ---- Reservas de mesa ----

  @Post(':id/reservations')
  createReservation(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateTableReservationDto) {
    return this.service.createReservation(id, dto);
  }

  @Get(':id/reservations')
  listReservations(@Param('id', ParseIntPipe) id: number) {
    return this.service.listReservations(id);
  }

  @Delete(':id/reservations/:reservationId')
  removeReservation(
    @Param('id', ParseIntPipe) id: number,
    @Param('reservationId', ParseIntPipe) reservationId: number,
  ) {
    return this.service.removeReservation(id, reservationId);
  }
}