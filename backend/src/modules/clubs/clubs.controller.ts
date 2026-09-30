import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { CreateClubInvitationDto } from './dto/create-club-invitation.dto';
import { JoinClubDto } from './dto/join-club.dto';
import { UpdateClubCollaboratorDto } from './dto/update-club-collaborator.dto';
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

  /** Invitaciones de colaborador pendientes para el usuario autenticado. */
  @Get('invitations/mine')
  myInvitations(@CurrentUser() user: User) {
    return this.service.myInvitations(user);
  }

  /** Acepta una invitación usando el código compartido por el admin del club. */
  @Post('invitations/:token/accept')
  acceptInvitation(@Param('token') token: string, @CurrentUser() user: User) {
    return this.service.acceptInvitation(token, user);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateClubDto, @CurrentUser() user: User) {
    return this.service.createClub(dto, user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /** Configuración del club (nombre, foto, ubicación, redes): admin del club. */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClubDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateClub(id, dto, user);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // ---- Dashboard del club ----

  /** Métricas del club: miembros, colaboradores, torneos en curso, mesas cash... */
  @Get(':id/stats')
  stats(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.service.stats(id, user);
  }

  // ---- Miembros y colaboradores ----

  @Get(':id/members')
  members(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.service.listMembers(id, user);
  }

  /** Colaboradores del club con sus permisos. */
  @Get(':id/collaborators')
  collaborators(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.service.listCollaborators(id, user);
  }

  /** Cambia los permisos de un colaborador (admin, operador, cajero). */
  @Patch(':id/collaborators/:memberId')
  updateCollaborator(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: UpdateClubCollaboratorDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateCollaboratorRole(id, memberId, dto, user);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: UpdateClubMemberDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateMember(id, memberId, dto, user);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @CurrentUser() user: User,
  ) {
    return this.service.removeMember(id, memberId, user);
  }

  // ---- Invitaciones de colaboradores ----

  @Get(':id/invitations')
  invitations(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.service.listInvitations(id, user);
  }

  @Post(':id/invitations')
  invite(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateClubInvitationDto,
    @CurrentUser() user: User,
  ) {
    return this.service.createInvitation(id, dto, user);
  }

  @Delete(':id/invitations/:invitationId')
  revokeInvitation(
    @Param('id', ParseIntPipe) id: number,
    @Param('invitationId', ParseIntPipe) invitationId: number,
    @CurrentUser() user: User,
  ) {
    return this.service.revokeInvitation(id, invitationId, user);
  }
}

