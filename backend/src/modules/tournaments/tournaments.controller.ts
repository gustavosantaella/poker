import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { DeepPartial, FindOptionsWhere, In, Not } from 'typeorm';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { GenerateStructureDto } from './dto/blind-structure.dto';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { CreateReservationDto, RebuyDto, UpdateReservationDto } from './dto/reservation.dto';
import { CreateTournamentChipDto } from './dto/tournament-chip.dto';
import { UpdatePrizesDto } from './dto/tournament-prize.dto';
import { Tournament, TournamentStatus } from './entities/tournament.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { TournamentsService } from './tournaments.service';

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly service: TournamentsService) {}

  @Get()
  findAll(
    @Query() pagination: PaginationDto,
    @Query('excludeStatus') excludeStatus?: string,
    @Query('clubId') clubId?: number,
  ) {
    // Permite excluir estados de la lista (p. ej. el player solo quiere torneos
    // distintos de 'completed'). El admin no envía este parámetro y sigue viendo todo.
    const excluded = (excludeStatus ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as TournamentStatus[];
    const where: FindOptionsWhere<Tournament> | undefined = excluded.length
      ? { status: Not(In(excluded)) }
      : undefined;
    const baseWhere = where ?? {};
    return this.service.findAll({
      ...pagination,
      where: clubId ? { clubId, ...baseWhere } : baseWhere,
      order: { startDate: 'DESC' },
    });
  }

  @Post('generate-structure')
  generateStructure(@Body() dto: GenerateStructureDto) {
    return this.service.generateStructure(dto);
  }

  /** Listado de jugadores (usado por el admin al gestionar reservas). */
  @Roles(UserRole.ADMIN)
  @Get('players')
  listPlayers() {
    return this.service.listPlayers();
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
  create(@Body() dto: CreateTournamentDto, @CurrentUser() user: User) {
    return this.service.create({ ...dto, createdByUserId: user.id } as DeepPartial<Tournament>);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTournamentDto) {
    return this.service.update(id, dto as DeepPartial<Tournament>);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // ---- Estado en vivo (solo admin) ----

  @Roles(UserRole.ADMIN)
  @Post(':id/start')
  start(@Param('id', ParseIntPipe) id: number) {
    return this.service.start(id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/pause')
  pause(@Param('id', ParseIntPipe) id: number) {
    return this.service.pause(id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/resume')
  resume(@Param('id', ParseIntPipe) id: number) {
    return this.service.resume(id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/next-level')
  nextLevel(@Param('id', ParseIntPipe) id: number) {
    return this.service.nextLevel(id);
  }

  // ---- Reservas ----

  @Get(':id/reservations')
  listReservations(@Param('id', ParseIntPipe) id: number) {
    return this.service.listReservations(id);
  }

  /** Un player solo puede reservarse a sí mismo; el admin para cualquier jugador. */
  @Post(':id/reservations')
  createReservation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: User,
  ) {
    const userId = user.role === UserRole.PLAYER ? user.id : dto.userId;
    return this.service.createReservation(id, { ...dto, userId });
  }

  /** Aceptar/rechazar y asignar mesa/asiento: solo admin. */
  @Roles(UserRole.ADMIN)
  @Patch(':id/reservations/:reservationId')
  updateReservation(
    @Param('id', ParseIntPipe) id: number,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.service.updateReservation(id, reservationId, dto);
  }

  /** Rebuy: el player solo sobre su propia reserva; el admin sobre cualquiera. */
  @Post(':id/reservations/:reservationId/rebuy')
  rebuy(
    @Param('id', ParseIntPipe) id: number,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Body() dto: RebuyDto,
    @CurrentUser() user: User,
  ) {
    return this.service.rebuy(id, reservationId, dto, { userId: user.id, role: user.role });
  }

  /** Stand-up: el player solo sobre su propia reserva; el admin sobre cualquiera. */
  @Post(':id/reservations/:reservationId/stand-up')
  standUp(
    @Param('id', ParseIntPipe) id: number,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @CurrentUser() user: User,
  ) {
    return this.service.standUp(id, reservationId, { userId: user.id, role: user.role });
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/reservations/:reservationId/eliminate')
  eliminate(
    @Param('id', ParseIntPipe) id: number,
    @Param('reservationId', ParseIntPipe) reservationId: number,
  ) {
    return this.service.eliminate(id, reservationId);
  }

  /** Borrar reserva: el player solo la suya; el admin cualquiera. */
  @Delete(':id/reservations/:reservationId')
  removeReservation(
    @Param('id', ParseIntPipe) id: number,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @CurrentUser() user: User,
  ) {
    return this.service.removeReservation(id, reservationId, { userId: user.id, role: user.role });
  }

  // ---- Fichas del torneo ----

  @Get(':id/chips')
  listChips(@Param('id', ParseIntPipe) id: number) {
    return this.service.listChips(id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/chips')
  addChip(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateTournamentChipDto) {
    return this.service.addChip(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id/chips/:tournamentChipId')
  removeChip(
    @Param('id', ParseIntPipe) id: number,
    @Param('tournamentChipId', ParseIntPipe) tournamentChipId: number,
  ) {
    return this.service.removeChip(id, tournamentChipId);
  }

  // ---- Premios ----

  @Get(':id/prizes')
  listPrizes(@Param('id', ParseIntPipe) id: number) {
    return this.service.listPrizes(id);
  }

  @Roles(UserRole.ADMIN)
  @Put(':id/prizes')
  replacePrizes(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePrizesDto) {
    return this.service.replacePrizes(id, dto);
  }
}