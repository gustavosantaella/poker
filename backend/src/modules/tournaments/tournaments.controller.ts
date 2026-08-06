import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { GenerateStructureDto } from './dto/blind-structure.dto';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { CreateReservationDto, UpdateReservationDto } from './dto/reservation.dto';
import { CreateTournamentChipDto } from './dto/tournament-chip.dto';
import { UpdatePrizesDto } from './dto/tournament-prize.dto';
import { Tournament } from './entities/tournament.entity';
import { TournamentsService } from './tournaments.service';

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly service: TournamentsService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAll({ ...pagination, order: { startDate: 'DESC' } });
  }

  @Post('generate-structure')
  generateStructure(@Body() dto: GenerateStructureDto) {
    return this.service.generateStructure(dto);
  }

  @Get('players')
  listPlayers() {
    return this.service.listPlayers();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTournamentDto) {
    return this.service.create(dto as DeepPartial<Tournament>);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTournamentDto) {
    return this.service.update(id, dto as DeepPartial<Tournament>);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // ---- Estado en vivo ----

  @Post(':id/start')
  start(@Param('id', ParseIntPipe) id: number) {
    return this.service.start(id);
  }

  @Post(':id/pause')
  pause(@Param('id', ParseIntPipe) id: number) {
    return this.service.pause(id);
  }

  @Post(':id/resume')
  resume(@Param('id', ParseIntPipe) id: number) {
    return this.service.resume(id);
  }

  @Post(':id/next-level')
  nextLevel(@Param('id', ParseIntPipe) id: number) {
    return this.service.nextLevel(id);
  }

  // ---- Reservas ----

  @Get(':id/reservations')
  listReservations(@Param('id', ParseIntPipe) id: number) {
    return this.service.listReservations(id);
  }

  @Post(':id/reservations')
  createReservation(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateReservationDto) {
    return this.service.createReservation(id, dto);
  }

  @Patch(':id/reservations/:reservationId')
  updateReservation(
    @Param('id', ParseIntPipe) id: number,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.service.updateReservation(id, reservationId, dto);
  }

  @Delete(':id/reservations/:reservationId')
  removeReservation(
    @Param('id', ParseIntPipe) id: number,
    @Param('reservationId', ParseIntPipe) reservationId: number,
  ) {
    return this.service.removeReservation(id, reservationId);
  }

  // ---- Fichas del torneo ----

  @Get(':id/chips')
  listChips(@Param('id', ParseIntPipe) id: number) {
    return this.service.listChips(id);
  }

  @Post(':id/chips')
  addChip(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateTournamentChipDto) {
    return this.service.addChip(id, dto);
  }

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

  @Put(':id/prizes')
  replacePrizes(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePrizesDto) {
    return this.service.replacePrizes(id, dto);
  }
}