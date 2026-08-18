import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ChipsService } from './chips.service';
import { CreateChipDto } from './dto/create-chip.dto';
import { UpdateChipDto } from './dto/update-chip.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('chips')
export class ChipsController {
  constructor(private readonly service: ChipsService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAll({ ...pagination, order: { value: 'ASC' } });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateChipDto) {
    return this.service.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChipDto) {
    return this.service.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
