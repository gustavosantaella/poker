import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ClubRoles } from '../../common/decorators/club-roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ClubMemberRole } from '../clubs/entities/club-member.entity';
import { User } from '../users/entities/user.entity';
import { CashService } from './cash.service';
import {
  RegisterPayoutsDto,
  SettleCashMovementsDto,
  SyncCashDto,
} from './dto/cash-actions.dto';
import { CashQueryDto } from './dto/cash-query.dto';
import { CreateCashMovementDto, UpdateCashMovementDto } from './dto/create-cash-movement.dto';

/**
 * Caja y recaudación de un club.
 *
 * Todo el módulo exige el rol de **cajero o superior** dentro del club (el admin
 * global del sistema siempre pasa): el equipo ve cuánto dinero ha entrado y salido,
 * qué jugador pagó en cada torneo, cuánto ha invertido cada uno y qué queda por
 * cobrar. Los premios y el borrado de movimientos quedan en manos de operadores y
 * administradores.
 */
@Controller('clubs/:clubId/cash')
export class CashController {
  constructor(private readonly service: CashService) {}

  /** Resumen del periodo: entradas, salidas, pendiente, comisión, bolo y saldo. */
  @ClubRoles(ClubMemberRole.CASHIER)
  @Get('summary')
  summary(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Query() query: CashQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.service.summary(clubId, query, user);
  }

  /** Recaudación por torneo (lo cobrado, lo pendiente, premios y gastos). */
  @ClubRoles(ClubMemberRole.CASHIER)
  @Get('tournaments')
  tournaments(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Query() query: CashQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.service.listTournaments(clubId, query, user);
  }

  /** Detalle del torneo: quién pagó y cuánto, quién sigue a cobro y premios. */
  @ClubRoles(ClubMemberRole.CASHIER)
  @Get('tournaments/:tournamentId')
  tournamentDetail(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @CurrentUser() user: User,
  ) {
    return this.service.tournamentDetail(clubId, tournamentId, user);
  }

  /** Ranking de jugadores por dinero invertido en el club. */
  @ClubRoles(ClubMemberRole.CASHIER)
  @Get('players')
  players(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Query() query: CashQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.service.listPlayers(clubId, query, user);
  }

  /** Detalle de un jugador: total invertido, desglose por torneo y movimientos. */
  @ClubRoles(ClubMemberRole.CASHIER)
  @Get('players/:userId')
  playerDetail(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: CashQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.service.playerDetail(clubId, userId, query, user);
  }

  /** Libro de caja paginado con los totales de todo el filtro. */
  @ClubRoles(ClubMemberRole.CASHIER)
  @Get('movements')
  movements(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Query() query: CashQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.service.listMovements(clubId, query, user);
  }

  /** Sincroniza las reservas del club con el libro de caja (idempotente). */
  @ClubRoles(ClubMemberRole.CASHIER)
  @Post('sync')
  sync(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Body() dto: SyncCashDto,
    @CurrentUser() user: User,
  ) {
    return this.service.sync(clubId, dto, user);
  }

  /** Cobra (o devuelve a pendiente) movimientos en bloque: jugador, torneo o ids. */
  @ClubRoles(ClubMemberRole.CASHIER)
  @Post('settle')
  settle(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Body() dto: SettleCashMovementsDto,
    @CurrentUser() user: User,
  ) {
    return this.service.settle(clubId, dto, user);
  }

  /** Registra un movimiento de caja manual (gasto, ingreso, retirada, ajuste...). */
  @ClubRoles(ClubMemberRole.CASHIER)
  @Post('movements')
  createMovement(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Body() dto: CreateCashMovementDto,
    @CurrentUser() user: User,
  ) {
    return this.service.createMovement(clubId, dto, user);
  }

  /** Edita un movimiento (estado, forma de pago, nota; el importe es de admin). */
  @ClubRoles(ClubMemberRole.CASHIER)
  @Patch('movements/:movementId')
  updateMovement(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Param('movementId', ParseIntPipe) movementId: number,
    @Body() dto: UpdateCashMovementDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateMovement(clubId, movementId, dto, user);
  }

  /** Elimina un movimiento de caja (solo el administrador del club). */
  @ClubRoles(ClubMemberRole.ADMIN)
  @Delete('movements/:movementId')
  deleteMovement(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Param('movementId', ParseIntPipe) movementId: number,
    @CurrentUser() user: User,
  ) {
    return this.service.deleteMovement(clubId, movementId, user);
  }

  /** Registra los premios pagados de un torneo (un movimiento por puesto). */
  @ClubRoles(ClubMemberRole.OPERATOR)
  @Post('tournaments/:tournamentId/payouts')
  registerPayouts(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Body() dto: RegisterPayoutsDto,
    @CurrentUser() user: User,
  ) {
    return this.service.registerPayouts(clubId, tournamentId, dto, user);
  }
}
