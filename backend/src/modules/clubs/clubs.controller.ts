import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ClubRoles } from '../../common/decorators/club-roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { CreateClubInvitationDto } from './dto/create-club-invitation.dto';
import { JoinClubDto } from './dto/join-club.dto';
import { TransferClubOwnershipDto } from './dto/transfer-club-ownership.dto';
import { UpdateClubCollaboratorDto } from './dto/update-club-collaborator.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { UpdateClubMemberDto } from './dto/update-club-member.dto';
import { ClubMemberRole } from './entities/club-member.entity';

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
  @ClubRoles(ClubMemberRole.ADMIN)
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
  @ClubRoles(ClubMemberRole.CASHIER)
  @Get(':id/stats')
  stats(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.service.stats(id, user);
  }

  /** Historial de acciones sensibles del club (equipo, permisos, propiedad...). */
  @ClubRoles(ClubMemberRole.ADMIN)
  @Get(':id/audit')
  audit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? Number.parseInt(limit, 10) : 50;
    return this.service.listAuditLog(id, user, Number.isFinite(parsed) ? parsed : 50);
  }

  // ---- Miembros y colaboradores ----

  @ClubRoles(ClubMemberRole.CASHIER)
  @Get(':id/members')
  members(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.service.listMembers(id, user);
  }

  /** Colaboradores del club con sus permisos. */
  @ClubRoles(ClubMemberRole.OPERATOR)
  @Get(':id/collaborators')
  collaborators(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.service.listCollaborators(id, user);
  }

  /** Cambia los permisos de un colaborador (admin, operador, cajero). */
  @ClubRoles(ClubMemberRole.ADMIN)
  @Patch(':id/collaborators/:memberId')
  updateCollaborator(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: UpdateClubCollaboratorDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateCollaboratorRole(id, memberId, dto, user);
  }

  /** Aprueba o rechaza una solicitud de ingreso al club. */
  @ClubRoles(ClubMemberRole.ADMIN)
  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: UpdateClubMemberDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateMember(id, memberId, dto, user);
  }

  @ClubRoles(ClubMemberRole.ADMIN)
  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @CurrentUser() user: User,
  ) {
    return this.service.removeMember(id, memberId, user);
  }

  // ---- Invitaciones de colaboradores ----

  @ClubRoles(ClubMemberRole.ADMIN)
  @Get(':id/invitations')
  invitations(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.service.listInvitations(id, user);
  }

  /**
   * Invita a un colaborador: crea la invitación, la envía por correo y devuelve el
   * código para compartirlo a mano si el correo no llega (`emailSent: false`).
   */
  @ClubRoles(ClubMemberRole.ADMIN)
  @Post(':id/invitations')
  invite(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateClubInvitationDto,
    @CurrentUser() user: User,
  ) {
    return this.service.createInvitation(id, dto, user);
  }

  /** Reenvía la invitación (rota el código y renueva la caducidad). */
  @ClubRoles(ClubMemberRole.ADMIN)
  @Post(':id/invitations/:invitationId/resend')
  resendInvitation(
    @Param('id', ParseIntPipe) id: number,
    @Param('invitationId', ParseIntPipe) invitationId: number,
    @CurrentUser() user: User,
  ) {
    return this.service.resendInvitation(id, invitationId, user);
  }

  @ClubRoles(ClubMemberRole.ADMIN)
  @Delete(':id/invitations/:invitationId')
  revokeInvitation(
    @Param('id', ParseIntPipe) id: number,
    @Param('invitationId', ParseIntPipe) invitationId: number,
    @CurrentUser() user: User,
  ) {
    return this.service.revokeInvitation(id, invitationId, user);
  }

  // ---- Propiedad y código del club ----

  /**
   * Traspasa la propiedad del club a otro miembro. Solo puede hacerlo el
   * propietario actual (o un admin global).
   */
  @ClubRoles(ClubMemberRole.ADMIN)
  @Post(':id/transfer-ownership')
  transferOwnership(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferClubOwnershipDto,
    @CurrentUser() user: User,
  ) {
    return this.service.transferOwnership(id, dto.userId, user);
  }

  /** Regenera el código de invitación del club (invalida el anterior). */
  @ClubRoles(ClubMemberRole.ADMIN)
  @Post(':id/rotate-code')
  rotateCode(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.service.rotateClubCode(id, user);
  }
}

