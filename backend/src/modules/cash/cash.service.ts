import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Not, Repository } from 'typeorm';
import { DEFAULT_CURRENCY } from '../../common/constants/currencies';
import { Paginated } from '../../common/types/paginated';
import { ClubAuditAction } from '../clubs/entities/club-audit-log.entity';
import { ClubMemberRole } from '../clubs/entities/club-member.entity';
import { ClubsService } from '../clubs/clubs.service';
import { RealtimeService } from '../realtime/realtime.service';
import {
  ReservationStatus,
  TournamentReservation,
} from '../tournaments/entities/tournament-reservation.entity';
import {
  Tournament,
  TournamentStatus,
} from '../tournaments/entities/tournament.entity';
import { User } from '../users/entities/user.entity';
import {
  RegisterPayoutsDto,
  SettleCashMovementsDto,
  SyncCashDto,
} from './dto/cash-actions.dto';
import { CashQueryDto } from './dto/cash-query.dto';
import {
  CreateCashMovementDto,
  UpdateCashMovementDto,
} from './dto/create-cash-movement.dto';
import {
  CLUB_CASH_TYPE_DIRECTION,
  CLUB_CASH_VOID_NOTE,
  ClubCashDirection,
  ClubCashMovement,
  ClubCashMovementStatus,
  ClubCashMovementType,
  ClubCashPaymentMethod,
} from './entities/club-cash-movement.entity';

/** Días que cubre el periodo por defecto (si no se envían `from`/`to`). */
export const CASH_DEFAULT_PERIOD_DAYS = 30;
/** Tope de días de un periodo consultable (evita agregaciones enormes). */
const MAX_PERIOD_DAYS = 400;
/** Tope de movimientos que se resuelven en una sola operación en bloque. */
const MAX_SETTLE_MOVEMENTS = 1_000;
/** Tope de movimientos que se agregan en memoria por consulta. */
const MAX_AGGREGATED_MOVEMENTS = 50_000;
/** Tope de torneos que se recorren en una sincronización. */
const MAX_SYNC_TOURNAMENTS = 500;
/** Tope de jugadores devueltos en el ranking. */
const MAX_RANKED_PLAYERS = 1_000;

/** Juegan el torneo: contaron entrada (aunque luego se levanten o sean eliminados). */
const ENTERED_STATUSES = [
  ReservationStatus.ACCEPTED,
  ReservationStatus.STOOD_UP,
  ReservationStatus.ELIMINATED,
];

/** Periodo resuelto de una consulta. */
export interface CashPeriod {
  from: Date;
  to: Date;
  fromKey: string;
  toKey: string;
  periodDays: number;
}

/** Total de dinero por tipo de movimiento dentro del periodo. */
export interface CashTypeBreakdown {
  type: ClubCashMovementType;
  direction: ClubCashDirection;
  /** Número de movimientos (cobrados + pendientes). */
  count: number;
  /** Importe ya cobrado/pagado. */
  amount: number;
  /** Importe pendiente de cobro/pago. */
  pending: number;
}

/** Total de dinero por forma de pago (solo movimientos ya cobrados/pagados). */
export interface CashMethodBreakdown {
  method: ClubCashPaymentMethod;
  count: number;
  amount: number;
}

/** Punto diario de entradas/salidas de caja. */
export interface CashDailyPoint {
  date: string;
  in: number;
  out: number;
  net: number;
}

/** Totales de dinero (se usan en el resumen y al pie del libro de caja). */
export interface ClubCashTotals {
  /** Dinero que entró en caja (cobrado). */
  collected: number;
  /** Dinero que salió de caja (pagado). */
  paidOut: number;
  /** collected - paidOut. */
  net: number;
  /** Pendiente de cobro. */
  pendingIn: number;
  /** Pendiente de pago. */
  pendingOut: number;
}

/** Resumen de recaudación del club en un periodo. */
export interface ClubCashSummary extends ClubCashTotals {
  clubId: number;
  from: string;
  to: string;
  periodDays: number;
  currency: string;
  /** Saldo histórico de caja del club (todo el dinero cobrado menos el pagado). */
  balance: number;
  /** Comisión del club incluida en lo cobrado (fee de entradas y re-entradas). */
  commission: number;
  /** Parte de lo cobrado destinada a premios (bolo recaudado). */
  prizePot: number;
  /** Entradas cobradas. */
  entries: number;
  /** Re-entradas cobradas. */
  reEntries: number;
  /** Add-ons cobrados. */
  addOns: number;
  /** Movimientos pendientes de cobro/pago. */
  pendingCount: number;
  /** Movimientos ya cobrados/pagados. */
  paidCount: number;
  /** Jugadores distintos con movimientos en el periodo. */
  players: number;
  /** Torneos del periodo. */
  tournaments: number;
  /** Entrada media por jugador cobrado. */
  averageTicket: number;
  /**
   * Dinero de las reservas del periodo que todavía no tiene movimiento de caja
   * (falta sincronizar).
   */
  unregistered: number;
  byType: CashTypeBreakdown[];
  byMethod: CashMethodBreakdown[];
  daily: CashDailyPoint[];
}

/** Consolidado de caja de un torneo (una fila del listado "Recaudado"). */
export interface ClubCashTournamentRollup {
  tournamentId: number;
  name: string;
  status: TournamentStatus;
  startDate: string;
  currency: string;
  buyIn: number;
  fee: number;
  addOnAmount: number | null;
  /** Jugadores que entraron en el torneo (reservas aceptadas/levantadas/eliminadas). */
  players: number;
  /** Entradas registradas (jugadores + re-entradas) según las reservas. */
  entries: number;
  reEntries: number;
  /** Add-ons registrados en caja. */
  addOns: number;
  /** Dinero que debería haberse cobrado según las reservas y el add-on del torneo. */
  expected: number;
  /** Dinero de las reservas que todavía no tiene movimiento de caja. */
  unregistered: number;
  /** Cobrado (movimientos pagados que entran). */
  collected: number;
  /** Pendiente total (dinero por cobrar + dinero por pagar). */
  pending: number;
  /** Dinero por cobrar de este torneo (entradas, re-entradas y add-ons pendientes). */
  pendingIn: number;
  /** Dinero por pagar de este torneo (premios/gastos pendientes de pago). */
  pendingOut: number;
  /** Anulado (histórico que ya no cuenta). */
  voided: number;
  /** Premios pagados. */
  prizesPaid: number;
  /** Gastos y retiradas imputados al torneo. */
  expenses: number;
  /** collected - prizesPaid - expenses. */
  net: number;
  /** Comisión del club incluida en lo cobrado. */
  commission: number;
  /** Bolo recaudado (entradas cobradas menos comisión). */
  prizePot: number;
  collectedCount: number;
  pendingCount: number;
  /** Jugadores con algún cobro pendiente. */
  unpaidPlayers: number;
}

/** Detalle de lo que ha puesto/ganado un jugador en un torneo. */
export interface ClubCashTournamentPlayer {
  userId: number;
  name: string;
  email: string;
  /** Estado de su reserva en el torneo (null si solo tiene movimientos de caja). */
  reservationStatus: ReservationStatus | null;
  tableNumber: number | null;
  seatNumber: number | null;
  entries: number;
  reEntries: number;
  addOns: number;
  /** Todo lo que ha pagado por jugar (cobrado + pendiente). */
  invested: number;
  /** Ya cobrado. */
  paid: number;
  /** Pendiente de cobro. */
  pending: number;
  /** Premios recibidos. */
  prizes: number;
  /** prizes - invested. */
  net: number;
}

/** Detalle completo de un torneo dentro del módulo de recaudación. */
export interface ClubCashTournamentDetail {
  tournament: {
    id: number;
    name: string;
    status: TournamentStatus;
    startDate: string;
    currency: string;
    buyIn: number;
    fee: number;
    addOnEnabled: boolean;
    addOnAmount: number | null;
    maxPlayers: number | null;
    tableCount: number;
  };
  summary: ClubCashTournamentRollup;
  players: ClubCashTournamentPlayer[];
  movements: ClubCashMovement[];
}

/** Ranking de lo que ha invertido un jugador en el club. */
export interface ClubCashPlayer {
  userId: number;
  name: string;
  email: string;
  tournaments: number;
  entries: number;
  reEntries: number;
  addOns: number;
  invested: number;
  paid: number;
  pending: number;
  prizes: number;
  net: number;
  lastMovementAt: string | null;
}

/** Jugador con su desglose por torneo (pantalla de detalle). */
export interface ClubCashPlayerDetail {
  player: ClubCashPlayer;
  byTournament: {
    tournamentId: number;
    name: string;
    startDate: string;
    entries: number;
    reEntries: number;
    addOns: number;
    invested: number;
    paid: number;
    pending: number;
    prizes: number;
    net: number;
  }[];
  movements: ClubCashMovement[];
}

/** Página del libro de caja, con los totales de todo el filtro. */
export interface ClubCashMovementPage extends Paginated<ClubCashMovement> {
  totals: ClubCashTotals;
}

/** Resultado de sincronizar las reservas con el libro de caja. */
export interface ClubCashSyncResult {
  tournaments: number;
  created: number;
  updated: number;
  removed: number;
  total: number;
}

/** Resultado de cobrar (o volver a pendiente) movimientos en bloque. */
export interface ClubCashSettleResult {
  status: ClubCashMovementStatus;
  updated: number;
  amount: number;
}

/** Texto en español de cada tipo de movimiento (frases de auditoría). */
const CLUB_CASH_TYPE_LABEL: Record<ClubCashMovementType, string> = {
  [ClubCashMovementType.ENTRY]: 'una entrada',
  [ClubCashMovementType.RE_ENTRY]: 'una re-entrada',
  [ClubCashMovementType.ADD_ON]: 'un add-on',
  [ClubCashMovementType.PRIZE]: 'un premio',
  [ClubCashMovementType.EXPENSE]: 'un gasto',
  [ClubCashMovementType.WITHDRAWAL]: 'una retirada de caja',
  [ClubCashMovementType.DEPOSIT]: 'un ingreso',
  [ClubCashMovementType.ADJUSTMENT]: 'un ajuste',
};

/**
 * Caja y recaudación del club: libro mayor de movimientos de dinero.
 *
 * Todas las lecturas y escrituras exigen rol de **cajero o superior** dentro del
 * club (el admin global del sistema siempre pasa), de modo que el equipo ve
 * cuánto dinero ha entrado y salido, quién pagó y cuánto, y qué queda por cobrar.
 *
 * Los importes se agregan en memoria a partir del libro de caja: el volumen
 * mensual de un club es de unos pocos miles de filas y así todos los cálculos
 * (comisión incluida, bolo, ranking por jugador) comparten la misma fuente.
 */
@Injectable()
export class CashService {
  private readonly logger = new Logger(CashService.name);

  constructor(
    @InjectRepository(ClubCashMovement)
    private readonly movementsRepo: Repository<ClubCashMovement>,
    @InjectRepository(Tournament)
    private readonly tournamentsRepo: Repository<Tournament>,
    @InjectRepository(TournamentReservation)
    private readonly reservationsRepo: Repository<TournamentReservation>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly clubs: ClubsService,
    private readonly realtime: RealtimeService,
  ) {}

  // ---------------- Utilidades ----------------

  /** Avisa a los paneles abiertos de que la caja del club cambió. */
  private emitCash(clubId: number, action: string): void {
    this.realtime.emitClub(clubId, 'club:cash', { clubId, action });
  }

  /** Exige el rol indicado dentro del club (cajero o superior por defecto). */
  private async assertAccess(
    clubId: number,
    requester: User,
    role: ClubMemberRole = ClubMemberRole.CASHIER,
  ): Promise<void> {
    await this.clubs.assertClubRank(clubId, requester, role);
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /** Clave `YYYY-MM-DD` en hora local (agrupa series y compara periodos). */
  private dayKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  /** Convierte `YYYY-MM-DD` en fecha local (medianoche). */
  private parseDay(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1);
  }

  /**
   * Día en el que el dinero entra o sale de la caja: el día del torneo y, si el
   * torneo todavía no ha empezado, hoy. Las pre-inscripciones de un torneo
   * futuro se cobran hoy: anotarlas en el futuro las dejaría fuera de la caja
   * del día (y el módulo "Recaudado" nunca las mostraría hasta esa fecha).
   */
  private cashDay(startDate: Date, reference: Date = new Date()): Date {
    const day = new Date(startDate.getTime());
    return day.getTime() > reference.getTime()
      ? new Date(reference.getTime())
      : day;
  }

  /**
   * Resuelve el periodo de la consulta. Sin `from`/`to` devuelve los últimos
   * {@link CASH_DEFAULT_PERIOD_DAYS} días (incluido hoy).
   */
  private resolvePeriod(query: CashQueryDto): CashPeriod {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDay = query.to
      ? this.parseDay(query.to)
      : new Date(today.getTime());
    const firstDay = query.from
      ? this.parseDay(query.from)
      : new Date(lastDay.getTime());
    if (!query.from) {
      firstDay.setDate(firstDay.getDate() - (CASH_DEFAULT_PERIOD_DAYS - 1));
    }
    if (firstDay.getTime() > lastDay.getTime()) {
      throw new BadRequestException('`from` cannot be after `to`');
    }
    const from = new Date(firstDay.getTime());
    const to = new Date(lastDay.getTime());
    to.setHours(23, 59, 59, 999);
    // Se cuentan días de calendario (el redondeo absorbe los cambios de horario).
    const days =
      Math.round((lastDay.getTime() - firstDay.getTime()) / 86_400_000) + 1;
    return {
      from,
      to,
      fromKey: this.dayKey(from),
      toKey: this.dayKey(to),
      periodDays: Math.min(Math.max(days, 1), MAX_PERIOD_DAYS),
    };
  }

  /** Constructor base del libro de caja filtrado (se reutiliza varias veces). */
  private movementsQuery(
    clubId: number,
    period: CashPeriod,
    query: Partial<CashQueryDto> = {},
  ) {
    const qb = this.movementsRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'u')
      .leftJoinAndSelect('m.tournament', 't')
      .where('m.club_id = :clubId', { clubId })
      .andWhere('m.occurred_at BETWEEN :from AND :to', {
        from: period.from,
        to: period.to,
      });

    if (query.tournamentId)
      qb.andWhere('m.tournament_id = :tournamentId', {
        tournamentId: query.tournamentId,
      });
    if (query.userId)
      qb.andWhere('m.user_id = :userId', { userId: query.userId });
    if (query.type) qb.andWhere('m.type = :type', { type: query.type });
    if (query.status)
      qb.andWhere('m.status = :status', { status: query.status });
    if (query.method)
      qb.andWhere('m.method = :method', { method: query.method });
    if (query.search?.trim()) {
      qb.andWhere(
        '(m.note LIKE :search OR u.name LIKE :search OR t.name LIKE :search)',
        {
          search: `%${query.search.trim()}%`,
        },
      );
    }
    return qb;
  }

  /** Movimientos del periodo (sin los anulados, salvo que se pidan). */
  private async findMovements(
    clubId: number,
    period: CashPeriod,
    query: Partial<CashQueryDto> = {},
    options: { includeVoid?: boolean; take?: number } = {},
  ): Promise<ClubCashMovement[]> {
    const qb = this.movementsQuery(clubId, period, query)
      .orderBy('m.occurredAt', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .take(options.take ?? MAX_AGGREGATED_MOVEMENTS);
    if (!options.includeVoid) {
      qb.andWhere('m.status != :voidStatus', {
        voidStatus: ClubCashMovementStatus.VOID,
      });
    }
    const movements = await qb.getMany();
    const cap = options.take ?? MAX_AGGREGATED_MOVEMENTS;
    if (movements.length >= cap) {
      this.logger.warn(
        `La caja del club #${clubId} alcanzó el tope de ${cap} movimientos en el periodo: el resumen puede quedar incompleto.`,
      );
    }
    return movements;
  }

  /** Serie diaria vacía de los últimos días del periodo (para el detalle en la app). */
  private emptyDaily(period: CashPeriod): Map<string, CashDailyPoint> {
    const span = Math.min(period.periodDays, 40);
    const map = new Map<string, CashDailyPoint>();
    for (let offset = span - 1; offset >= 0; offset -= 1) {
      const day = new Date(period.to.getTime());
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - offset);
      map.set(this.dayKey(day), {
        date: this.dayKey(day),
        in: 0,
        out: 0,
        net: 0,
      });
    }
    return map;
  }

  /**
   * Acumula un conjunto de movimientos en totales de caja (entradas, salidas,
   * comisión, bolo, desglose por tipo y forma de pago, y serie diaria).
   */
  private aggregateMovements(
    movements: ClubCashMovement[],
    dailyBase: Map<string, CashDailyPoint>,
  ) {
    const acc = {
      collected: 0,
      paidOut: 0,
      pendingIn: 0,
      pendingOut: 0,
      commission: 0,
      prizePot: 0,
      /** Dinero cobrado de entradas/re-entradas/add-ons (base de la entrada media). */
      playCollected: 0,
      entries: 0,
      reEntries: 0,
      addOns: 0,
      paidCount: 0,
      pendingCount: 0,
      players: new Set<number>(),
      tournaments: new Set<number>(),
      pendingUsers: new Set<number>(),
      byType: new Map<ClubCashMovementType, CashTypeBreakdown>(),
      byMethod: new Map<ClubCashPaymentMethod, CashMethodBreakdown>(),
      daily: dailyBase,
    };

    for (const movement of movements) {
      const amount = Number(movement.amount ?? 0);
      const fee = Number(movement.feeAmount ?? 0);
      const incoming = movement.direction === ClubCashDirection.IN;
      const isPlayMoney =
        movement.type === ClubCashMovementType.ENTRY ||
        movement.type === ClubCashMovementType.RE_ENTRY ||
        movement.type === ClubCashMovementType.ADD_ON;

      const type = acc.byType.get(movement.type) ?? {
        type: movement.type,
        direction: movement.direction,
        count: 0,
        amount: 0,
        pending: 0,
      };
      type.count += 1;

      const method = acc.byMethod.get(movement.method) ?? {
        method: movement.method,
        count: 0,
        amount: 0,
      };
      method.count += 1;

      if (movement.status === ClubCashMovementStatus.VOID) {
        acc.byType.set(type.type, type);
        acc.byMethod.set(method.method, method);
        continue;
      }

      if (movement.status === ClubCashMovementStatus.PAID) {
        type.amount = this.round2(type.amount + amount);
        method.amount = this.round2(method.amount + amount);
        acc.paidCount += 1;
        if (incoming) {
          acc.collected = this.round2(acc.collected + amount);
          if (isPlayMoney) {
            acc.playCollected = this.round2(acc.playCollected + amount);
            acc.commission = this.round2(acc.commission + fee);
            acc.prizePot = this.round2(acc.prizePot + amount - fee);
          }
          if (movement.type === ClubCashMovementType.ENTRY) acc.entries += 1;
          else if (movement.type === ClubCashMovementType.RE_ENTRY)
            acc.reEntries += 1;
          else if (movement.type === ClubCashMovementType.ADD_ON)
            acc.addOns += 1;
        } else {
          acc.paidOut = this.round2(acc.paidOut + amount);
        }
        const day = acc.daily.get(
          this.dayKey(new Date(movement.paidAt ?? movement.occurredAt)),
        );
        if (day) {
          if (incoming) day.in = this.round2(day.in + amount);
          else day.out = this.round2(day.out + amount);
          day.net = this.round2(day.in - day.out);
        }
      } else {
        type.pending = this.round2(type.pending + amount);
        acc.pendingCount += 1;
        if (incoming) acc.pendingIn = this.round2(acc.pendingIn + amount);
        else acc.pendingOut = this.round2(acc.pendingOut + amount);
        if (movement.userId) acc.pendingUsers.add(movement.userId);
      }

      if (movement.userId) acc.players.add(movement.userId);
      if (movement.tournamentId) acc.tournaments.add(movement.tournamentId);
      acc.byType.set(type.type, type);
      acc.byMethod.set(method.method, method);
    }

    return acc;
  }

  /** Consolidado de caja de cada torneo (jugadores, entradas, cobrado, premios...). */
  private async rollupFor(
    tournaments: Tournament[],
    movements: ClubCashMovement[],
  ): Promise<ClubCashTournamentRollup[]> {
    if (tournaments.length === 0) return [];
    const ids = tournaments.map((tournament) => tournament.id);
    const rows = await this.reservationsRepo
      .createQueryBuilder('r')
      .select('r.tournament_id', 'tournamentId')
      .addSelect(
        'SUM(CASE WHEN r.status IN (:...entered) THEN 1 ELSE 0 END)',
        'players',
      )
      .addSelect(
        'SUM(CASE WHEN r.status IN (:...entered) THEN r.reEntries ELSE 0 END)',
        'reEntries',
      )
      .where('r.tournament_id IN (:...ids)', { ids })
      .setParameter('entered', ENTERED_STATUSES)
      .groupBy('r.tournament_id')
      .getRawMany<{
        tournamentId: number;
        players: string;
        reEntries: string;
      }>();
    const reservationStats = new Map(
      rows.map((row) => [
        Number(row.tournamentId),
        {
          players: Number(row.players ?? 0),
          reEntries: Number(row.reEntries ?? 0),
        },
      ]),
    );

    const movementsByTournament = new Map<number, ClubCashMovement[]>();
    for (const movement of movements) {
      if (!movement.tournamentId) continue;
      const list = movementsByTournament.get(movement.tournamentId) ?? [];
      list.push(movement);
      movementsByTournament.set(movement.tournamentId, list);
    }

    return tournaments.map((tournament) => {
      const list = movementsByTournament.get(tournament.id) ?? [];
      const stat = reservationStats.get(tournament.id) ?? {
        players: 0,
        reEntries: 0,
      };
      const buyIn = Number(tournament.buyIn ?? 0);
      const fee = Number(tournament.fee ?? 0);
      const addOnAmount =
        tournament.addOnAmount != null ? Number(tournament.addOnAmount) : null;
      let collected = 0;
      let pending = 0;
      let pendingIn = 0;
      let pendingOut = 0;
      let voided = 0;
      let prizesPaid = 0;
      let expenses = 0;
      let commission = 0;
      let prizePot = 0;
      let collectedCount = 0;
      let pendingCount = 0;
      let addOns = 0;
      const pendingUsers = new Set<number>();

      for (const movement of list) {
        const amount = Number(movement.amount ?? 0);
        if (movement.status === ClubCashMovementStatus.VOID) {
          voided = this.round2(voided + amount);
          continue;
        }
        if (movement.type === ClubCashMovementType.ADD_ON) addOns += 1;
        if (movement.status === ClubCashMovementStatus.PENDING) {
          pendingCount += 1;
          pending = this.round2(pending + amount);
          if (movement.direction === ClubCashDirection.IN) {
            pendingIn = this.round2(pendingIn + amount);
          } else {
            pendingOut = this.round2(pendingOut + amount);
          }
          if (movement.userId) pendingUsers.add(movement.userId);
          continue;
        }
        collectedCount += 1;
        if (movement.direction === ClubCashDirection.IN) {
          collected = this.round2(collected + amount);
          if (
            movement.type === ClubCashMovementType.ENTRY ||
            movement.type === ClubCashMovementType.RE_ENTRY
          ) {
            const movementFee = Number(movement.feeAmount ?? 0);
            commission = this.round2(commission + movementFee);
            prizePot = this.round2(prizePot + amount - movementFee);
          } else if (movement.type === ClubCashMovementType.ADD_ON) {
            prizePot = this.round2(prizePot + amount);
          }
        } else if (movement.type === ClubCashMovementType.PRIZE) {
          prizesPaid = this.round2(prizesPaid + amount);
        } else {
          expenses = this.round2(expenses + amount);
        }
      }

      const entries = stat.players + stat.reEntries;
      const expected = this.round2(
        entries * (buyIn + fee) + addOns * (addOnAmount ?? 0),
      );
      const registered = this.round2(collected + pending + voided);
      return {
        tournamentId: tournament.id,
        name: tournament.name,
        status: tournament.status,
        startDate: tournament.startDate.toISOString(),
        currency: tournament.currency ?? DEFAULT_CURRENCY,
        buyIn,
        fee,
        addOnAmount,
        players: stat.players,
        entries,
        reEntries: stat.reEntries,
        addOns,
        expected,
        unregistered: this.round2(Math.max(expected - registered, 0)),
        collected,
        pending,
        pendingIn,
        pendingOut,
        voided,
        prizesPaid,
        expenses,
        net: this.round2(collected - prizesPaid - expenses),
        commission,
        prizePot,
        collectedCount,
        pendingCount,
        unpaidPlayers: pendingUsers.size,
      };
    });
  }

  /**
   * Movimientos de una lista de torneos **sin acotar por periodo**.
   *
   * El consolidado de un torneo compara lo recaudado con las reservas que
   * respaldan el dinero (`expected`): las reservas no tienen fecha, así que el
   * dinero también debe contarse entero. Si se recortara al periodo, un torneo
   * cuyo cobro fue ayer aparecería como "sin registrar" al mirar la caja de hoy,
   * el botón de sincronizar no podría arreglarlo nunca y el detalle del torneo
   * (que sí usa todo el histórico) contradiría al listado.
   */
  private findTournamentMovements(
    clubId: number,
    tournamentIds: number[],
    query: Partial<CashQueryDto> = {},
  ): Promise<ClubCashMovement[]> {
    if (tournamentIds.length === 0) return Promise.resolve([]);
    const qb = this.movementsRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'u')
      .leftJoinAndSelect('m.tournament', 't')
      .where('m.club_id = :clubId', { clubId })
      .andWhere('m.tournament_id IN (:...tournamentIds)', { tournamentIds })
      .andWhere('m.status != :voidStatus', {
        voidStatus: ClubCashMovementStatus.VOID,
      });
    if (query.tournamentId)
      qb.andWhere('m.tournament_id = :tournamentId', {
        tournamentId: query.tournamentId,
      });
    if (query.userId)
      qb.andWhere('m.user_id = :userId', { userId: query.userId });
    if (query.type) qb.andWhere('m.type = :type', { type: query.type });
    if (query.status)
      qb.andWhere('m.status = :status', { status: query.status });
    if (query.method)
      qb.andWhere('m.method = :method', { method: query.method });
    if (query.search?.trim()) {
      qb.andWhere(
        '(m.note LIKE :search OR u.name LIKE :search OR t.name LIKE :search)',
        {
          search: `%${query.search.trim()}%`,
        },
      );
    }
    return qb.orderBy('m.occurredAt', 'DESC').getMany();
  }

  /** Torneos del club relevantes para el periodo (con movimientos o que arrancan dentro). */
  private async buildRollups(
    clubId: number,
    period: CashPeriod,
    movements: ClubCashMovement[],
    query: Partial<CashQueryDto> = {},
  ): Promise<ClubCashTournamentRollup[]> {
    const tournaments = await this.tournamentsRepo.find({
      where: query.tournamentId
        ? { id: query.tournamentId, clubId }
        : { clubId },
      take: MAX_SYNC_TOURNAMENTS,
    });
    if (query.tournamentId) {
      if (tournaments.length === 0) {
        throw new NotFoundException('Tournament not found in this club');
      }
      return this.rollupFor(tournaments, movements);
    }
    const withMovements = new Set(
      movements
        .map((movement) => movement.tournamentId)
        .filter((id): id is number => id !== null && id !== undefined),
    );
    const selected = tournaments
      .filter(
        (tournament) =>
          (tournament.startDate >= period.from &&
            tournament.startDate <= period.to) ||
          withMovements.has(tournament.id),
      )
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    // El periodo decide qué torneos se listan; el dinero de cada torneo, no.
    const history = await this.findTournamentMovements(
      clubId,
      selected.map((tournament) => tournament.id),
      query,
    );
    return this.rollupFor(selected, history);
  }

  /** Saldo de caja del club: todo lo cobrado menos todo lo pagado (histórico). */
  private async totalBalance(clubId: number): Promise<number> {
    const raw = await this.movementsRepo
      .createQueryBuilder('m')
      .select(
        `COALESCE(SUM(CASE WHEN m.status = 'paid' AND m.direction = 'in' THEN m.amount ELSE 0 END), 0)`,
        'collected',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN m.status = 'paid' AND m.direction = 'out' THEN m.amount ELSE 0 END), 0)`,
        'paidOut',
      )
      .where('m.club_id = :clubId', { clubId })
      .getRawOne<{ collected: string; paidOut: string }>();
    return this.round2(Number(raw?.collected ?? 0) - Number(raw?.paidOut ?? 0));
  }

  // ---------------- Lecturas ----------------

  /**
   * Resumen de recaudación del club en el periodo: dinero que entró y salió,
   * pendiente de cobro, comisión del club, bolo, desglose por tipo/forma de pago,
   * serie diaria y saldo histórico de caja.
   */
  async summary(
    clubId: number,
    query: CashQueryDto,
    requester: User,
  ): Promise<ClubCashSummary> {
    await this.assertAccess(clubId, requester);
    const period = this.resolvePeriod(query);
    const movements = await this.findMovements(clubId, period, query);
    const acc = this.aggregateMovements(movements, this.emptyDaily(period));
    const rollups = await this.buildRollups(clubId, period, movements, query);
    const playEntries = acc.entries + acc.reEntries + acc.addOns;
    const balance = await this.totalBalance(clubId);

    return {
      clubId,
      from: period.fromKey,
      to: period.toKey,
      periodDays: period.periodDays,
      currency: movements[0]?.currency ?? DEFAULT_CURRENCY,
      balance,
      collected: acc.collected,
      paidOut: acc.paidOut,
      net: this.round2(acc.collected - acc.paidOut),
      pendingIn: acc.pendingIn,
      pendingOut: acc.pendingOut,
      commission: acc.commission,
      prizePot: acc.prizePot,
      entries: acc.entries,
      reEntries: acc.reEntries,
      addOns: acc.addOns,
      pendingCount: acc.pendingCount,
      paidCount: acc.paidCount,
      players: acc.players.size,
      tournaments: rollups.length,
      averageTicket:
        playEntries > 0 ? this.round2(acc.playCollected / playEntries) : 0,
      unregistered: this.round2(
        rollups.reduce((total, rollup) => total + rollup.unregistered, 0),
      ),
      byType: [...acc.byType.values()].sort((a, b) => b.amount - a.amount),
      byMethod: [...acc.byMethod.values()].sort((a, b) => b.amount - a.amount),
      daily: [...acc.daily.values()],
    };
  }

  /**
   * Dinero de add-ons de cada torneo (cruce interno con el módulo de torneos).
   *
   * Los add-ons no viven en las reservas: se cobran como movimiento de caja, así
   * que el libro de caja es la única fuente fiable. Se descuentan los anulados y
   * se suma el importe real de cada movimiento (no el precio actual del torneo,
   * que puede haber cambiado desde que se cobró).
   */
  async addOnsAmountByTournament(
    tournamentIds: number[],
  ): Promise<Map<number, number>> {
    if (tournamentIds.length === 0) return new Map();
    const rows = await this.movementsRepo
      .createQueryBuilder('m')
      .select('m.tournament_id', 'tournamentId')
      .addSelect('COALESCE(SUM(m.amount), 0)', 'amount')
      .where('m.tournament_id IN (:...ids)', { ids: tournamentIds })
      .andWhere('m.type = :type', { type: ClubCashMovementType.ADD_ON })
      .andWhere('m.status <> :void', { void: ClubCashMovementStatus.VOID })
      .groupBy('m.tournament_id')
      .getRawMany<{ tournamentId: number; amount: string }>();
    return new Map(
      rows.map((row) => [
        Number(row.tournamentId),
        this.round2(Number(row.amount ?? 0)),
      ]),
    );
  }

  /**
   * Recaudación por torneo: lo que debería haberse cobrado, lo cobrado, lo
   * pendiente, los premios pagados y los gastos imputados a cada torneo.
   */
  async listTournaments(
    clubId: number,
    query: CashQueryDto,
    requester: User,
  ): Promise<ClubCashTournamentRollup[]> {
    await this.assertAccess(clubId, requester);
    const period = this.resolvePeriod(query);
    const movements = await this.findMovements(clubId, period, query);
    return this.buildRollups(clubId, period, movements, query);
  }

  /**
   * Detalle de un torneo para el módulo "Recaudado": quién pagó y cuánto, quién
   * sigue a cobro, cuánto se ha recaudado y qué premios se han entregado.
   */
  async tournamentDetail(
    clubId: number,
    tournamentId: number,
    requester: User,
  ): Promise<ClubCashTournamentDetail> {
    await this.assertAccess(clubId, requester);
    const tournament = await this.tournamentsRepo.findOne({
      where: { id: tournamentId, clubId },
    });
    if (!tournament) {
      throw new NotFoundException('Tournament not found in this club');
    }
    const [movements, reservations] = await Promise.all([
      this.movementsRepo
        .createQueryBuilder('m')
        .leftJoinAndSelect('m.user', 'u')
        .leftJoinAndSelect('m.tournament', 't')
        .where('m.club_id = :clubId', { clubId })
        .andWhere('m.tournament_id = :tournamentId', { tournamentId })
        .orderBy('m.id', 'DESC')
        .getMany(),
      this.reservationsRepo.find({
        where: { tournamentId },
        order: { createdAt: 'ASC' },
      }),
    ]);
    const [summary] = await this.rollupFor([tournament], movements);

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        startDate: tournament.startDate.toISOString(),
        currency: tournament.currency ?? DEFAULT_CURRENCY,
        buyIn: Number(tournament.buyIn ?? 0),
        fee: Number(tournament.fee ?? 0),
        addOnEnabled: Boolean(tournament.addOnEnabled),
        addOnAmount:
          tournament.addOnAmount != null
            ? Number(tournament.addOnAmount)
            : null,
        maxPlayers: tournament.maxPlayers ?? null,
        tableCount: tournament.tableCount ?? 1,
      },
      summary,
      players: this.buildTournamentPlayers(movements, reservations),
      movements,
    };
  }

  /** Ranking de jugadores por dinero invertido en el club (entradas, rebuys, add-ons). */
  async listPlayers(
    clubId: number,
    query: CashQueryDto,
    requester: User,
  ): Promise<ClubCashPlayer[]> {
    await this.assertAccess(clubId, requester);
    const period = this.resolvePeriod(query);
    const movements = await this.findMovements(clubId, period, {
      ...query,
      userId: undefined,
    });
    return this.aggregatePlayers(movements).slice(0, MAX_RANKED_PLAYERS);
  }

  /** Detalle de un jugador: totales, desglose por torneo y últimos movimientos. */
  async playerDetail(
    clubId: number,
    userId: number,
    query: CashQueryDto,
    requester: User,
  ): Promise<ClubCashPlayerDetail> {
    await this.assertAccess(clubId, requester);
    const period = this.resolvePeriod(query);
    const movements = await this.findMovements(clubId, period, {
      ...query,
      userId,
    });
    const [player] = this.aggregatePlayers(movements);
    const byTournament = new Map<
      number,
      ClubCashPlayerDetail['byTournament'][number]
    >();

    for (const movement of movements) {
      if (
        !movement.tournamentId ||
        movement.status === ClubCashMovementStatus.VOID
      )
        continue;
      const row = byTournament.get(movement.tournamentId) ?? {
        tournamentId: movement.tournamentId,
        name: movement.tournament?.name ?? `Torneo #${movement.tournamentId}`,
        startDate: (
          movement.tournament?.startDate ?? movement.occurredAt
        ).toISOString(),
        entries: 0,
        reEntries: 0,
        addOns: 0,
        invested: 0,
        paid: 0,
        pending: 0,
        prizes: 0,
        net: 0,
      };
      const amount = Number(movement.amount ?? 0);
      if (movement.type === ClubCashMovementType.ENTRY) row.entries += 1;
      if (movement.type === ClubCashMovementType.RE_ENTRY) row.reEntries += 1;
      if (movement.type === ClubCashMovementType.ADD_ON) row.addOns += 1;
      if (movement.direction === ClubCashDirection.IN) {
        row.invested = this.round2(row.invested + amount);
        if (movement.status === ClubCashMovementStatus.PAID) {
          row.paid = this.round2(row.paid + amount);
        } else {
          row.pending = this.round2(row.pending + amount);
        }
      } else if (
        movement.type === ClubCashMovementType.PRIZE &&
        movement.status === ClubCashMovementStatus.PAID
      ) {
        row.prizes = this.round2(row.prizes + amount);
      }
      row.net = this.round2(row.prizes - row.invested);
      byTournament.set(row.tournamentId, row);
    }

    return {
      player: player ?? {
        userId,
        name: `Jugador #${userId}`,
        email: '',
        tournaments: 0,
        entries: 0,
        reEntries: 0,
        addOns: 0,
        invested: 0,
        paid: 0,
        pending: 0,
        prizes: 0,
        net: 0,
        lastMovementAt: null,
      },
      byTournament: [...byTournament.values()].sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      ),
      movements: movements.slice(0, 200),
    };
  }

  /** Página del libro de caja con los totales de todo el filtro (no solo la página). */
  async listMovements(
    clubId: number,
    query: CashQueryDto,
    requester: User,
  ): Promise<ClubCashMovementPage> {
    await this.assertAccess(clubId, requester);
    const period = this.resolvePeriod(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const [items, total] = await this.movementsQuery(clubId, period, query)
      .orderBy('m.occurredAt', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const raw = await this.movementsQuery(clubId, period, query)
      .select(
        `COALESCE(SUM(CASE WHEN m.status = 'paid' AND m.direction = 'in' THEN m.amount ELSE 0 END), 0)`,
        'collected',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN m.status = 'paid' AND m.direction = 'out' THEN m.amount ELSE 0 END), 0)`,
        'paidOut',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN m.status = 'pending' AND m.direction = 'in' THEN m.amount ELSE 0 END), 0)`,
        'pendingIn',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN m.status = 'pending' AND m.direction = 'out' THEN m.amount ELSE 0 END), 0)`,
        'pendingOut',
      )
      .getRawOne<{
        collected: string;
        paidOut: string;
        pendingIn: string;
        pendingOut: string;
      }>();
    const collected = this.round2(Number(raw?.collected ?? 0));
    const paidOut = this.round2(Number(raw?.paidOut ?? 0));

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      totals: {
        collected,
        paidOut,
        net: this.round2(collected - paidOut),
        pendingIn: this.round2(Number(raw?.pendingIn ?? 0)),
        pendingOut: this.round2(Number(raw?.pendingOut ?? 0)),
      },
    };
  }

  // ---------------- Agregados por jugador ----------------

  /**
   * Fila por jugador del torneo: lo que ha invertido (entradas, re-entradas y
   * add-ons), lo que ya ha pagado, lo que queda a cobro y los premios recibidos.
   * Se incluyen también los jugadores que solo tienen movimientos de caja (por
   * ejemplo un add-on o un premio sin reserva) para no perder dinero por el camino.
   */
  private buildTournamentPlayers(
    movements: ClubCashMovement[],
    reservations: TournamentReservation[],
  ): ClubCashTournamentPlayer[] {
    const rows = new Map<number, ClubCashTournamentPlayer>();
    const ensure = (
      userId: number,
      user?: User | null,
    ): ClubCashTournamentPlayer => {
      const current = rows.get(userId);
      if (current) return current;
      const created: ClubCashTournamentPlayer = {
        userId,
        name: user?.name ?? `Jugador #${userId}`,
        email: user?.email ?? '',
        reservationStatus: null,
        tableNumber: null,
        seatNumber: null,
        entries: 0,
        reEntries: 0,
        addOns: 0,
        invested: 0,
        paid: 0,
        pending: 0,
        prizes: 0,
        net: 0,
      };
      rows.set(userId, created);
      return created;
    };

    for (const reservation of reservations) {
      if (!ENTERED_STATUSES.includes(reservation.status)) continue;
      const player = ensure(reservation.userId, reservation.user);
      player.reservationStatus = reservation.status;
      player.tableNumber = reservation.tableNumber;
      player.seatNumber = reservation.seatNumber;
    }

    for (const movement of movements) {
      if (!movement.userId || movement.status === ClubCashMovementStatus.VOID)
        continue;
      const player = ensure(movement.userId, movement.user);
      const amount = Number(movement.amount ?? 0);
      if (movement.type === ClubCashMovementType.ENTRY) player.entries += 1;
      if (movement.type === ClubCashMovementType.RE_ENTRY)
        player.reEntries += 1;
      if (movement.type === ClubCashMovementType.ADD_ON) player.addOns += 1;
      if (movement.direction === ClubCashDirection.IN) {
        player.invested = this.round2(player.invested + amount);
        if (movement.status === ClubCashMovementStatus.PAID) {
          player.paid = this.round2(player.paid + amount);
        } else {
          player.pending = this.round2(player.pending + amount);
        }
      } else if (
        movement.type === ClubCashMovementType.PRIZE &&
        movement.status === ClubCashMovementStatus.PAID
      ) {
        player.prizes = this.round2(player.prizes + amount);
      }
    }

    return [...rows.values()]
      .map((player) => ({
        ...player,
        net: this.round2(player.prizes - player.invested),
      }))
      .sort((a, b) => b.invested - a.invested || a.name.localeCompare(b.name));
  }

  /** Ranking de jugadores por dinero invertido a partir de un conjunto de movimientos. */
  private aggregatePlayers(movements: ClubCashMovement[]): ClubCashPlayer[] {
    const rows = new Map<number, ClubCashPlayer>();
    const tournamentSets = new Map<number, Set<number>>();

    for (const movement of movements) {
      if (!movement.userId || movement.status === ClubCashMovementStatus.VOID)
        continue;
      const userId = movement.userId;
      const player = rows.get(userId) ?? {
        userId,
        name: movement.user?.name ?? `Jugador #${userId}`,
        email: movement.user?.email ?? '',
        tournaments: 0,
        entries: 0,
        reEntries: 0,
        addOns: 0,
        invested: 0,
        paid: 0,
        pending: 0,
        prizes: 0,
        net: 0,
        lastMovementAt: null,
      };
      const tournaments = tournamentSets.get(userId) ?? new Set<number>();
      if (movement.tournamentId) tournaments.add(movement.tournamentId);
      tournamentSets.set(userId, tournaments);

      const amount = Number(movement.amount ?? 0);
      if (movement.type === ClubCashMovementType.ENTRY) player.entries += 1;
      if (movement.type === ClubCashMovementType.RE_ENTRY)
        player.reEntries += 1;
      if (movement.type === ClubCashMovementType.ADD_ON) player.addOns += 1;
      if (movement.direction === ClubCashDirection.IN) {
        player.invested = this.round2(player.invested + amount);
        if (movement.status === ClubCashMovementStatus.PAID) {
          player.paid = this.round2(player.paid + amount);
        } else {
          player.pending = this.round2(player.pending + amount);
        }
      } else if (
        movement.type === ClubCashMovementType.PRIZE &&
        movement.status === ClubCashMovementStatus.PAID
      ) {
        player.prizes = this.round2(player.prizes + amount);
      }
      const occurredAt = new Date(movement.occurredAt).toISOString();
      if (!player.lastMovementAt || occurredAt > player.lastMovementAt) {
        player.lastMovementAt = occurredAt;
      }
      rows.set(userId, player);
    }

    return [...rows.values()]
      .map((player) => ({
        ...player,
        tournaments: tournamentSets.get(player.userId)?.size ?? 0,
        net: this.round2(player.prizes - player.invested),
      }))
      .sort((a, b) => b.invested - a.invested || a.name.localeCompare(b.name));
  }

  // ---------------- Sincronización con las reservas ----------------

  /**
   * Convierte las reservas aceptadas del club en movimientos de caja (una entrada
   * por jugador y una re-entrada por cada rebuy). Es idempotente: los movimientos
   * llevan `sourceKey`, así que repetir la sincronización no duplica cobros.
   *
   * - Los movimientos nuevos nacen **cobrados**: el dinero de una inscripción o una
   *   re-entrada se cobra al registrar al jugador, así que nunca queda "por cobrar".
   * - Los pendientes se reajustan si cambia el buy-in/fee del torneo; los ya
   *   cobrados no se tocan (el dinero que entró no se reescribe). Un cobro que el
   *   cajero devolvió a pendiente a mano se respeta: la sincronización no lo vuelve
   *   a cobrar sola.
   * - Si una entrada desaparece (jugador rechazado) el movimiento pendiente se
   *   borra y, si ya estaba cobrado, se marca como anulado.
   */
  async sync(
    clubId: number,
    dto: SyncCashDto,
    requester: User,
  ): Promise<ClubCashSyncResult> {
    await this.assertAccess(clubId, requester);
    return this.syncClub(clubId, dto, requester.id);
  }

  /**
   * Reconciliación automática que disparan otros módulos (las reservas del torneo)
   * cuando un jugador entra, se re-compra o deja el torneo, para que el dinero
   * aparezca en la caja sin que nadie pulse "sincronizar". Igual que {@link sync}
   * pero sin comprobar el rol: el llamante ya validó el acceso al torneo.
   */
  async reconcileTournament(
    clubId: number,
    tournamentId: number,
    actorId: number,
  ): Promise<ClubCashSyncResult> {
    return this.syncClub(clubId, { tournamentId }, actorId);
  }

  /** Reconcilia la caja de los torneos indicados en el DTO. */
  private async syncClub(
    clubId: number,
    dto: SyncCashDto,
    actorId: number,
  ): Promise<ClubCashSyncResult> {
    const tournaments = await this.tournamentsRepo.find({
      where: dto.tournamentId ? { id: dto.tournamentId, clubId } : { clubId },
      take: MAX_SYNC_TOURNAMENTS,
    });
    if (dto.tournamentId && tournaments.length === 0) {
      throw new NotFoundException('Tournament not found in this club');
    }

    const result: ClubCashSyncResult = {
      tournaments: tournaments.length,
      created: 0,
      updated: 0,
      removed: 0,
      total: 0,
    };
    for (const tournament of tournaments) {
      const partial = await this.syncTournament(
        clubId,
        tournament,
        actorId,
        dto,
      );
      result.created += partial.created;
      result.updated += partial.updated;
      result.removed += partial.removed;
      result.total = this.round2(result.total + partial.total);
    }

    if (result.created > 0 || result.updated > 0 || result.removed > 0) {
      this.emitCash(clubId, 'cash.synced');
    }
    return result;
  }

  /**
   * Sincroniza un torneo concreto dentro de una transacción. Las entradas y
   * re-entradas de las reservas que juegan se anotan **cobradas** (el cobro se hace
   * al registrar al jugador); el estado de los movimientos que ya existían no se
   * reescribe salvo para anular un cobro cuya reserva dejó de jugar.
   */
  private async syncTournament(
    clubId: number,
    tournament: Tournament,
    actorId: number,
    options: SyncCashDto,
  ): Promise<{
    created: number;
    updated: number;
    removed: number;
    total: number;
  }> {
    const entryAmount = this.round2(
      Number(tournament.buyIn ?? 0) + Number(tournament.fee ?? 0),
    );
    const feeAmount = this.round2(Number(tournament.fee ?? 0));
    const method = options.method ?? ClubCashPaymentMethod.CASH;

    return this.movementsRepo.manager.transaction(async (manager) => {
      const [reservations, existing] = await Promise.all([
        manager.find(TournamentReservation, {
          where: { tournamentId: tournament.id, status: In(ENTERED_STATUSES) },
        }),
        // Solo los movimientos que genera la sincronización (llevan reserva): los
        // premios y los movimientos manuales del torneo no se tocan aquí.
        manager.find(ClubCashMovement, {
          where: {
            clubId,
            tournamentId: tournament.id,
            reservationId: Not(IsNull()),
          },
        }),
      ]);

      // Movimientos esperados según las reservas actuales.
      const desired = new Map<
        string,
        {
          type: ClubCashMovementType;
          userId: number;
          reservationId: number;
          amount: number;
          feeAmount: number;
        }
      >();
      for (const reservation of reservations) {
        desired.set(`entry:reservation:${reservation.id}`, {
          type: ClubCashMovementType.ENTRY,
          userId: reservation.userId,
          reservationId: reservation.id,
          amount: entryAmount,
          feeAmount,
        });
        for (let index = 1; index <= (reservation.reEntries ?? 0); index += 1) {
          desired.set(`re_entry:reservation:${reservation.id}:${index}`, {
            type: ClubCashMovementType.RE_ENTRY,
            userId: reservation.userId,
            reservationId: reservation.id,
            amount: entryAmount,
            feeAmount,
          });
        }
      }

      const existingByKey = new Map(
        existing
          .filter((movement) => movement.sourceKey)
          .map((movement) => [movement.sourceKey as string, movement]),
      );
      const now = new Date();
      // Las pre-inscripciones de un torneo futuro se cobran hoy, no el día del torneo.
      const cashDay = this.cashDay(tournament.startDate, now);
      const dirty: ClubCashMovement[] = [];
      let created = 0;
      let updated = 0;
      let removed = 0;
      let total = 0;

      for (const [sourceKey, spec] of desired) {
        total = this.round2(total + spec.amount);
        const current = existingByKey.get(sourceKey);
        if (!current) {
          // La inscripción se cobra al registrar al jugador: nace cobrada, con
          // fecha de caja del torneo (hoy si todavía no ha empezado) y sin pasar
          // por el estado "por cobrar".
          dirty.push(
            manager.create(ClubCashMovement, {
              clubId,
              tournamentId: tournament.id,
              userId: spec.userId,
              reservationId: spec.reservationId,
              type: spec.type,
              direction: ClubCashDirection.IN,
              status: ClubCashMovementStatus.PAID,
              method,
              amount: spec.amount,
              feeAmount: spec.feeAmount,
              currency: tournament.currency ?? DEFAULT_CURRENCY,
              occurredAt: cashDay,
              paidAt: now,
              createdByUserId: actorId,
              settledByUserId: actorId,
              sourceKey,
            }),
          );
          created += 1;
          continue;
        }

        // Lo ya cobrado no se reescribe: solo se ajustan los pendientes.
        let changed = false;
        if (current.status === ClubCashMovementStatus.VOID) {
          // El cobro se anuló cuando la reserva dejó de jugar; si vuelve a jugar
          // (el admin la acepta de nuevo) el cobro vuelve a existir, cobrado otra
          // vez: la inscripción se cobra al entrar.
          current.status = ClubCashMovementStatus.PAID;
          current.amount = spec.amount;
          current.feeAmount = spec.feeAmount;
          current.currency = tournament.currency ?? DEFAULT_CURRENCY;
          current.occurredAt = cashDay;
          current.paidAt = now;
          current.settledByUserId = actorId;
          current.method = method;
          if (current.note === CLUB_CASH_VOID_NOTE) current.note = null;
          dirty.push(current);
          updated += 1;
          continue;
        }
        if (current.status === ClubCashMovementStatus.PENDING) {
          // Un pendiente es un cobro que el cajero devolvió a mano (jugador que
          // paga más tarde): se reajusta el importe y la fecha, pero no se cobra
          // solo. Para eso está `settle`.
          if (Number(current.amount) !== spec.amount) {
            current.amount = spec.amount;
            changed = true;
          }
          if (Number(current.feeAmount ?? 0) !== spec.feeAmount) {
            current.feeAmount = spec.feeAmount;
            changed = true;
          }
          if (current.currency !== (tournament.currency ?? DEFAULT_CURRENCY)) {
            current.currency = tournament.currency ?? DEFAULT_CURRENCY;
            changed = true;
          }
          if (new Date(current.occurredAt).getTime() !== cashDay.getTime()) {
            current.occurredAt = cashDay;
            changed = true;
          }
        }
        if (changed) {
          dirty.push(current);
          updated += 1;
        }
      }

      // Movimientos generados que ya no corresponden a ninguna reserva.
      for (const current of existing) {
        if (!current.sourceKey || desired.has(current.sourceKey)) continue;
        if (current.status === ClubCashMovementStatus.PENDING) {
          await manager.delete(ClubCashMovement, current.id);
          removed += 1;
        } else if (current.status === ClubCashMovementStatus.PAID) {
          current.status = ClubCashMovementStatus.VOID;
          current.note = current.note ?? CLUB_CASH_VOID_NOTE;
          dirty.push(current);
          updated += 1;
        }
      }

      if (dirty.length > 0) {
        await manager.save(ClubCashMovement, dirty);
      }
      return { created, updated, removed, total };
    });
  }

  // ---------------- Cobros y pagos ----------------

  /**
   * Marca en bloque movimientos como cobrados (`status: paid`) o los devuelve a
   * pendientes. Sirve para cobrar la entrada de un jugador, cobrar todo un torneo
   * o deshacer un cobro equivocado.
   */
  async settle(
    clubId: number,
    dto: SettleCashMovementsDto,
    requester: User,
  ): Promise<ClubCashSettleResult> {
    await this.assertAccess(clubId, requester);
    if (!dto.movementIds?.length && !dto.tournamentId && !dto.userId) {
      throw new BadRequestException(
        'Indica movementIds, tournamentId o userId',
      );
    }

    const fromStatus =
      dto.status === ClubCashMovementStatus.PAID
        ? ClubCashMovementStatus.PENDING
        : ClubCashMovementStatus.PAID;
    const where: FindOptionsWhere<ClubCashMovement> = {
      clubId,
      status: fromStatus,
    };
    if (dto.movementIds?.length) where.id = In(dto.movementIds);
    if (dto.tournamentId) where.tournamentId = dto.tournamentId;
    if (dto.userId) where.userId = dto.userId;
    // Cobrar un torneo entero solo toca el dinero que entra: los premios o gastos
    // pendientes de pago se pagan por su propio flujo.
    if (dto.direction) where.direction = dto.direction;

    const movements = await this.movementsRepo.find({
      where,
      take: MAX_SETTLE_MOVEMENTS + 1,
      order: { id: 'ASC' },
    });
    if (movements.length > MAX_SETTLE_MOVEMENTS) {
      throw new BadRequestException(
        `Too many movements in a single operation (max ${MAX_SETTLE_MOVEMENTS})`,
      );
    }
    if (movements.length === 0) {
      return { status: dto.status, updated: 0, amount: 0 };
    }

    const now = new Date();
    const collecting = dto.status === ClubCashMovementStatus.PAID;
    for (const movement of movements) {
      movement.status = dto.status;
      if (dto.method) movement.method = dto.method;
      if (collecting) {
        movement.paidAt = now;
        // El dinero entra en la caja el día en que se cobra: si el cobro se confirma
        // más tarde (una pre-inscripción que se paga el día del torneo, un cobro que
        // el cajero cierra al día siguiente), el movimiento se anota ese día para que
        // aparezca en la caja del día que le toca.
        movement.occurredAt = now;
      } else {
        movement.paidAt = null;
      }
      movement.settledByUserId = collecting ? requester.id : null;
    }
    await this.movementsRepo.save(movements);

    const amount = this.round2(
      movements.reduce(
        (total, movement) => total + Number(movement.amount ?? 0),
        0,
      ),
    );
    const currency = movements[0]?.currency ?? DEFAULT_CURRENCY;
    const scope = dto.tournamentId
      ? ` del torneo #${dto.tournamentId}`
      : dto.userId
        ? ` del jugador #${dto.userId}`
        : '';
    await this.clubs.logClubAction({
      clubId,
      action: collecting
        ? ClubAuditAction.CASH_COLLECTED
        : ClubAuditAction.CASH_MOVEMENT_UPDATED,
      requester,
      targetType: dto.tournamentId ? 'tournament' : 'cash_movement',
      targetId: dto.tournamentId ?? movements[0].id,
      summary: collecting
        ? `${requester.name} cobró ${movements.length} movimientos${scope} por ${amount} ${currency}`
        : `${requester.name} devolvió a pendiente ${movements.length} movimientos${scope} (${amount} ${currency})`,
      metadata: {
        updated: movements.length,
        amount,
        status: dto.status,
        tournamentId: dto.tournamentId ?? null,
        userId: dto.userId ?? null,
      },
    });
    this.emitCash(clubId, collecting ? 'cash.collected' : 'cash.reopened');

    return { status: dto.status, updated: movements.length, amount };
  }

  /**
   * Registra un movimiento de caja a mano (gasto, retirada, ingreso, ajuste,
   * add-on, premio o entrada de un jugador que no viene de una reserva).
   * Por defecto nace ya cobrado/pagado: el cajero registra algo que ha ocurrido.
   */
  async createMovement(
    clubId: number,
    dto: CreateCashMovementDto,
    requester: User,
  ): Promise<ClubCashMovement> {
    await this.assertAccess(clubId, requester);

    let tournament: Tournament | null = null;
    if (dto.tournamentId) {
      tournament = await this.tournamentsRepo.findOne({
        where: { id: dto.tournamentId, clubId },
      });
      if (!tournament) {
        throw new NotFoundException('Tournament not found in this club');
      }
    }
    let user: User | null = null;
    if (dto.userId) {
      user = await this.usersRepo.findOne({ where: { id: dto.userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

    const playerTypes: ClubCashMovementType[] = [
      ClubCashMovementType.ENTRY,
      ClubCashMovementType.RE_ENTRY,
      ClubCashMovementType.ADD_ON,
      ClubCashMovementType.PRIZE,
    ];
    if (playerTypes.includes(dto.type) && !user) {
      throw new BadRequestException(
        'Este tipo de movimiento necesita un jugador',
      );
    }
    if (playerTypes.includes(dto.type) && !tournament) {
      throw new BadRequestException(
        'Este tipo de movimiento necesita un torneo',
      );
    }

    const direction =
      dto.type === ClubCashMovementType.ADJUSTMENT
        ? (dto.direction ?? ClubCashDirection.IN)
        : CLUB_CASH_TYPE_DIRECTION[dto.type];
    const isPlayMoney =
      dto.type === ClubCashMovementType.ENTRY ||
      dto.type === ClubCashMovementType.RE_ENTRY;
    const feeAmount = this.round2(
      dto.feeAmount ?? (isPlayMoney ? Number(tournament?.fee ?? 0) : 0),
    );
    if (feeAmount > dto.amount) {
      throw new BadRequestException(
        'La comisión incluida no puede superar el importe',
      );
    }

    const status = dto.status ?? ClubCashMovementStatus.PAID;
    const now = new Date();
    const occurredAt = dto.occurredAt ? this.parseDay(dto.occurredAt) : now;
    const movement = await this.movementsRepo.save(
      this.movementsRepo.create({
        clubId,
        tournamentId: tournament?.id ?? null,
        userId: user?.id ?? null,
        type: dto.type,
        direction,
        status,
        method: dto.method ?? ClubCashPaymentMethod.CASH,
        amount: dto.amount,
        feeAmount,
        currency: (
          dto.currency ??
          tournament?.currency ??
          DEFAULT_CURRENCY
        ).toUpperCase(),
        place: dto.place ?? null,
        note: dto.note?.trim() || null,
        occurredAt,
        paidAt: status === ClubCashMovementStatus.PAID ? occurredAt : null,
        createdByUserId: requester.id,
        settledByUserId:
          status === ClubCashMovementStatus.PAID ? requester.id : null,
        sourceKey: null,
      }),
    );

    await this.clubs.logClubAction({
      clubId,
      action: ClubAuditAction.CASH_MOVEMENT_CREATED,
      requester,
      targetType: 'cash_movement',
      targetId: movement.id,
      summary: `${requester.name} registró ${CLUB_CASH_TYPE_LABEL[dto.type]} de ${movement.amount} ${movement.currency}${
        user ? ` de ${user.name ?? user.email}` : ''
      }${status === ClubCashMovementStatus.PENDING ? ' (pendiente de cobro)' : ''}`,
      metadata: {
        type: dto.type,
        direction,
        amount: Number(movement.amount),
        status,
        tournamentId: tournament?.id ?? null,
        userId: user?.id ?? null,
      },
    });
    this.emitCash(clubId, 'cash.movement_created');
    return movement;
  }

  /**
   * Edita un movimiento de caja. El cajero puede confirmar cobros, cambiar la
   * forma de pago o anotar; cambiar el importe queda reservado al administrador.
   */
  async updateMovement(
    clubId: number,
    movementId: number,
    dto: UpdateCashMovementDto,
    requester: User,
  ): Promise<ClubCashMovement> {
    if (dto.amount !== undefined || dto.feeAmount !== undefined) {
      await this.clubs.assertClubRank(clubId, requester, ClubMemberRole.ADMIN);
    } else {
      await this.assertAccess(clubId, requester);
    }

    const movement = await this.movementsRepo.findOne({
      where: { id: movementId, clubId },
    });
    if (!movement) {
      throw new NotFoundException('Movement not found');
    }

    const previous = {
      status: movement.status,
      amount: Number(movement.amount ?? 0),
      method: movement.method,
    };

    if (dto.status) {
      movement.status = dto.status;
      movement.paidAt =
        dto.status === ClubCashMovementStatus.PAID
          ? (movement.paidAt ?? new Date())
          : null;
      movement.settledByUserId =
        dto.status === ClubCashMovementStatus.PAID ? requester.id : null;
    }
    if (dto.method) movement.method = dto.method;
    if (dto.note !== undefined) movement.note = dto.note.trim() || null;
    if (dto.amount !== undefined) movement.amount = dto.amount;
    if (dto.feeAmount !== undefined) movement.feeAmount = dto.feeAmount;
    if (
      movement.feeAmount != null &&
      Number(movement.feeAmount) > Number(movement.amount)
    ) {
      throw new BadRequestException(
        'La comisión incluida no puede superar el importe',
      );
    }
    await this.movementsRepo.save(movement);

    const changes: string[] = [];
    if (dto.status && dto.status !== previous.status) {
      changes.push(`estado ${previous.status} → ${dto.status}`);
    }
    if (dto.amount !== undefined && dto.amount !== previous.amount) {
      changes.push(`importe ${previous.amount} → ${dto.amount}`);
    }
    if (dto.method && dto.method !== previous.method) {
      changes.push(`forma de pago ${previous.method} → ${dto.method}`);
    }
    if (dto.note !== undefined) changes.push('nota');

    await this.clubs.logClubAction({
      clubId,
      action: ClubAuditAction.CASH_MOVEMENT_UPDATED,
      requester,
      targetType: 'cash_movement',
      targetId: movement.id,
      summary: `${requester.name} actualizó un movimiento de caja (${changes.join(', ') || 'sin cambios'})`,
      metadata: {
        movementId: movement.id,
        type: movement.type,
        amount: Number(movement.amount),
        status: movement.status,
        changes,
      },
    });
    this.emitCash(clubId, 'cash.movement_updated');
    return movement;
  }

  /** Elimina un movimiento de caja (solo el administrador del club). */
  async deleteMovement(
    clubId: number,
    movementId: number,
    requester: User,
  ): Promise<void> {
    await this.clubs.assertClubRank(clubId, requester, ClubMemberRole.ADMIN);
    const movement = await this.movementsRepo.findOne({
      where: { id: movementId, clubId },
    });
    if (!movement) {
      throw new NotFoundException('Movement not found');
    }
    await this.movementsRepo.delete(movement.id);
    await this.clubs.logClubAction({
      clubId,
      action: ClubAuditAction.CASH_MOVEMENT_DELETED,
      requester,
      targetType: 'cash_movement',
      targetId: movementId,
      summary: `${requester.name} eliminó ${CLUB_CASH_TYPE_LABEL[movement.type]} de ${movement.amount} ${movement.currency}`,
      metadata: {
        movementId,
        type: movement.type,
        amount: Number(movement.amount),
        status: movement.status,
        tournamentId: movement.tournamentId,
        userId: movement.userId,
      },
    });
    this.emitCash(clubId, 'cash.movement_deleted');
  }

  // ---------------- Premios ----------------

  /**
   * Registra los premios pagados de un torneo (un movimiento de salida por
   * puesto). Es idempotente por puesto: volver a guardar el mismo puesto
   * actualiza el importe y el jugador en vez de duplicar el pago.
   */
  async registerPayouts(
    clubId: number,
    tournamentId: number,
    dto: RegisterPayoutsDto,
    requester: User,
  ): Promise<ClubCashMovement[]> {
    await this.clubs.assertClubRank(clubId, requester, ClubMemberRole.OPERATOR);
    const tournament = await this.tournamentsRepo.findOne({
      where: { id: tournamentId, clubId },
    });
    if (!tournament) {
      throw new NotFoundException('Tournament not found in this club');
    }

    const places = new Set<number>();
    const users = await this.usersRepo.find({
      where: {
        id: In([...new Set(dto.payouts.map((payout) => payout.userId))]),
      },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    const saved: ClubCashMovement[] = [];
    for (const payout of dto.payouts) {
      if (places.has(payout.place)) {
        throw new BadRequestException(
          `El puesto ${payout.place} está repetido`,
        );
      }
      places.add(payout.place);
      const player = usersById.get(payout.userId);
      if (!player) {
        throw new NotFoundException(`User ${payout.userId} not found`);
      }
      saved.push(
        await this.upsertPayout(clubId, tournament, payout, player, requester),
      );
    }

    const total = this.round2(
      saved.reduce((sum, movement) => sum + Number(movement.amount ?? 0), 0),
    );
    await this.clubs.logClubAction({
      clubId,
      action: ClubAuditAction.CASH_PAYOUT_REGISTERED,
      requester,
      targetType: 'tournament',
      targetId: tournament.id,
      summary: `${requester.name} pagó ${saved.length} premios de ${tournament.name} por ${total} ${tournament.currency ?? DEFAULT_CURRENCY}`,
      metadata: {
        tournamentId: tournament.id,
        total,
        payouts: saved.map((movement) => ({
          place: movement.place,
          userId: movement.userId,
          amount: Number(movement.amount),
        })),
      },
    });
    this.emitCash(clubId, 'cash.payout_registered');
    return saved;
  }

  /** Crea o actualiza el premio de un puesto concreto (clave `prize:tournament:*`). */
  private async upsertPayout(
    clubId: number,
    tournament: Tournament,
    payout: {
      userId: number;
      place: number;
      amount: number;
      method?: ClubCashPaymentMethod;
    },
    player: User,
    requester: User,
  ): Promise<ClubCashMovement> {
    const sourceKey = `prize:tournament:${tournament.id}:place:${payout.place}`;
    const now = new Date();
    const existing = await this.movementsRepo.findOne({ where: { sourceKey } });

    if (existing) {
      existing.userId = player.id;
      existing.amount = payout.amount;
      existing.method = payout.method ?? existing.method;
      existing.status = ClubCashMovementStatus.PAID;
      existing.paidAt = existing.paidAt ?? now;
      existing.settledByUserId = requester.id;
      existing.place = payout.place;
      existing.note = `Premio ${payout.place}º puesto · ${player.name ?? player.email}`;
      return this.movementsRepo.save(existing);
    }

    return this.movementsRepo.save(
      this.movementsRepo.create({
        clubId,
        tournamentId: tournament.id,
        userId: player.id,
        type: ClubCashMovementType.PRIZE,
        direction: ClubCashDirection.OUT,
        status: ClubCashMovementStatus.PAID,
        method: payout.method ?? ClubCashPaymentMethod.CASH,
        amount: payout.amount,
        feeAmount: null,
        currency: tournament.currency ?? DEFAULT_CURRENCY,
        place: payout.place,
        note: `Premio ${payout.place}º puesto · ${player.name ?? player.email}`,
        occurredAt: now,
        paidAt: now,
        createdByUserId: requester.id,
        settledByUserId: requester.id,
        sourceKey,
      }),
    );
  }
}
