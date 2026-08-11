import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { User } from '../users/entities/user.entity';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { JoinClubDto } from './dto/join-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { UpdateClubMemberDto } from './dto/update-club-member.dto';

@Controller('clubs')
export class ClubsController {
  constructor(private readonly service: ClubsService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAllWithCounts({ ...pagination, order: { createdAt: 'DESC' } });
  }

  @Post('join')
  join(@Body() dto: JoinClubDto, @CurrentUser() user: User) {
    return this.service.joinClub(dto.code, user.id);
  }

  @Get('mine')
  mine(@CurrentUser() user: User) {
    return this.service.myClubs(user.id);
  }

  @Get('memberships/mine')
  myMemberships(@CurrentUser() user: User) {
    return this.service.myMemberships(user.id);
  }

  @Post()
  create(@Body() dto: CreateClubDto, @CurrentUser() user: User) {
    return this.service.createClub(dto, user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClubDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // ---- Miembros del club ----

  @Get(':id/members')
  members(@Param('id', ParseIntPipe) id: number) {
    return this.service.listMembers(id);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: UpdateClubMemberDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateMember(id, memberId, dto, user.id);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @CurrentUser() user: User,
  ) {
    return this.service.removeMember(id, memberId, user.id);
  }
}

