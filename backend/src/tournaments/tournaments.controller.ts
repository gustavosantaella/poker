import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { GenerateStructureDto } from './dto/blind-structure.dto';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { Tournament } from './entities/tournament.entity';
import { TournamentsService } from './tournaments.service';
import { PaginationDto } from '../common/dto/pagination.dto';

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
}