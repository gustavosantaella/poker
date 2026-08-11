import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, MoreThan, Repository } from 'typeorm';
import { CrudOptions, CrudService } from '../../common/services/crud.service';
import { Paginated } from '../../common/types/paginated';
import { Chip } from '../chips/entities/chip.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { buildBlindStructure } from './blind-structure.builder';
import { CreateReservationDto, RebuyDto, UpdateReservationDto } from './dto/reservation.dto';
import { CreateTournamentChipDto } from './dto/tournament-chip.dto';
import { UpdatePrizesDto } from './dto/tournament-prize.dto';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { GenerateStructureDto } from './dto/blind-structure.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { Tournament, TournamentStatus } from './entities/tournament.entity';
import { ReservationStatus, TournamentReservation } from './entities/tournament-reservation.entity';
import { TournamentChip } from './entities/tournament-chip.entity';
import { TournamentPrize } from './entities/tournament-prize.entity';
import { BlindStructureItem, BuildBlindStructureParams } from './types/blind-structure';

@Injectable()
export class TournamentsService extends CrudService<Tournament> {
  constructor(
    @InjectRepository(Tournament) repository: Repository<Tournament>,
    @InjectRepository(TournamentReservation)
    private readonly reservationsRepo: Repository<TournamentReservation>,
    @InjectRepository(TournamentChip)
    private readonly tournamentChipsRepo: Repository<TournamentChip>,
    @InjectRepository(TournamentPrize)
    private readonly prizesRepo: Repository<TournamentPrize>,
    @InjectRepository(Chip) private readonly chipsRepo: Repository<Chip>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {
    super(repository);
  }

  /** Listado de torneos enriqueciendo cada item con el conteo de reservas y jugadores aceptados. */
  async findAll(options: CrudOptions<Tournament> = {}): Promise<Paginated<Tournament>> {
    const result = await super.findAll(options);
    if (result.items.length === 0) return result;

    // Mantener vivo el estado de los torneos en curso antes de devolverlos.
    for (let i = 0; i < result.items.length; i++) {
      if (result.items[i].status === TournamentStatus.RUNNING) {
        result.items[i] = await this.syncLiveStatus(result.items[i]);
      }
    }

    const ids = result.items.map((t) => t.id);
    const rows = await this.reservationsRepo
      .createQueryBuilder('r')
      .select('r.tournament_id', 'tournamentId')
      .addSelect('COUNT(*)', 'reserved')
      .addSelect("SUM(CASE WHEN r.status = 'accepted' THEN 1 ELSE 0 END)", 'playing')
      .where('r.tournament_id IN (:...ids)', { ids })
      .groupBy('r.tournament_id')
      .getRawMany();
    const countsByTournament = new Map<number, { reserved: number; playing: number }>();
    for (const row of rows) {
      countsByTournament.set(Number(row.tournamentId), {
        reserved: Number(row.reserved ?? 0),
        playing: Number(row.playing ?? 0),
      });
    }

    return {
      ...result,
      items: result.items.map((t) => {
        const counts = countsByTournament.get(t.id) ?? { reserved: 0, playing: 0 };
        return { ...t, reservedCount: counts.reserved, playersCount: counts.playing };
      }),
    };
  }

  /** Detalle de torneo con los conteos de reservas y jugadores aceptados. */
  async findOne(id: number, relations?: string[]): Promise<Tournament> {
    const tournament = await super.findOne(id, relations);
    const synced = await this.syncLiveStatus(tournament);
    const counts = await this.getReservationCounts(id);
    return { ...synced, reservedCount: counts.reserved, playersCount: counts.playing };
  }

  private async getReservationCounts(tournamentId: number): Promise<{ reserved: number; playing: number }> {
    const row = await this.reservationsRepo
      .createQueryBuilder('r')
      .select('COUNT(*)', 'reserved')
      .addSelect("SUM(CASE WHEN r.status = 'accepted' THEN 1 ELSE 0 END)", 'playing')
      .where('r.tournament_id = :id', { id: tournamentId })
      .getRawOne();
    return {
      reserved: Number(row?.reserved ?? 0),
      playing: Number(row?.playing ?? 0),
    };
  }

  async create(data: DeepPartial<Tournament>): Promise<Tournament> {
    const dto = data as unknown as CreateTournamentDto;
    this.validateOptions(dto);
    const { blindStructure, blindConfig, ...rest } = dto;
    const structure =
      (blindStructure as BlindStructureItem[] | undefined) ??
      (blindConfig ? buildBlindStructure(blindConfig as BuildBlindStructureParams).items : null);
    if (!structure || structure.length === 0) {
      throw new BadRequestException(
        'Either blindConfig or blindStructure is required to build the blind levels',
      );
    }
    return super.create({
      ...rest,
      blindStructure: structure,
      blindConfig: blindConfig ?? null,
    } as DeepPartial<Tournament>);
  }

  async update(id: number, data: DeepPartial<Tournament>): Promise<Tournament> {
    const dto = data as unknown as UpdateTournamentDto;
    const current = await this.findOne(id);
    this.validateOptions({ ...current, ...dto } as unknown as CreateTournamentDto);

    const { blindStructure, blindConfig, ...rest } = dto;
    let nextStructure = current.blindStructure;
    if (blindStructure) {
      nextStructure = blindStructure as BlindStructureItem[];
    } else if (blindConfig) {
      nextStructure = buildBlindStructure(blindConfig as BuildBlindStructureParams).items;
    }

    // Si se redujo el numero de mesas, desasignar a los jugadores de las mesas eliminadas.
    // (se reasignan automaticamente en el proximo accept/rebuy o manualmente).
    if (dto.tableCount != null && dto.tableCount < (current.tableCount ?? 1)) {
      await this.reservationsRepo.update(
        { tournamentId: id, tableNumber: MoreThan(dto.tableCount) },
        { tableNumber: null, seatNumber: null },
      );
    }

    return super.update(id, {
      ...rest,
      blindStructure: nextStructure,
      blindConfig: blindConfig ?? current.blindConfig,
    } as DeepPartial<Tournament>);
  }

  generateStructure(params: GenerateStructureDto) {
    return buildBlindStructure(params as BuildBlindStructureParams);
  }

  // ---------------- Estado en vivo ----------------

  /**
   * Calcula la posición en vivo de un torneo en curso: si el tiempo del
   * nivel/descanso actual ya se agotó, devuelve el torneo avanzado al siguiente
   * item a partir de los timestamps (startedAt / levelStartedAt) y la estructura.
   * El avance de niveles NO se persiste (lo persiste nextLevel) para evitar que
   * una lectura compita con "siguiente nivel" y se salten los descansos.
   * La FINALIZACIÓN sí se persiste (idempotente): cuando se agota el último
   * item de la estructura, el torneo pasa automáticamente a 'completed'.
   */
  private async syncLiveStatus(tournament: Tournament): Promise<Tournament> {
    if (tournament.status !== TournamentStatus.RUNNING) {
      return tournament;
    }
    const structure = tournament.blindStructure;
    if (!structure || structure.length === 0) {
      return tournament;
    }
    const now = Date.now();

    let current = tournament.currentLevel ?? 0;
    let levelStartMs = tournament.levelStartedAt
      ? new Date(tournament.levelStartedAt).getTime()
      : Number.NaN;

    if (Number.isNaN(levelStartMs)) {
      // Fallback: derivar el inicio del nivel desde startedAt + duraciones previas.
      if (!tournament.startedAt) {
        return tournament;
      }
      const base = new Date(tournament.startedAt).getTime();
      if (Number.isNaN(base)) {
        return tournament;
      }
      levelStartMs = base;
      for (let i = 0; i < current; i++) {
        levelStartMs += (structure[i].durationMin ?? 0) * 60_000;
      }
    }

    // El nivel guardado apunta fuera de la estructura (p. ej. se acortó la
    // estructura): el torneo ya agotó sus niveles, se completa.
    if (tournament.currentLevel != null && tournament.currentLevel >= structure.length) {
      await this.complete(tournament.id);
      return { ...tournament, status: TournamentStatus.COMPLETED, currentLevel: null, levelStartedAt: null };
    }

    let advanced = false;
    while (current < structure.length) {
      const item = structure[current];
      const durationMs = (item.durationMin ?? 0) * 60_000;
      if (now < levelStartMs + durationMs) {
        break;
      }
      if (current >= structure.length - 1) {
        // El último item de la estructura ya se agotó: el torneo terminó.
        await this.complete(tournament.id);
        return { ...tournament, status: TournamentStatus.COMPLETED, currentLevel: null, levelStartedAt: null };
      }
      levelStartMs += durationMs;
      current += 1;
      advanced = true;
    }

    if (advanced) {
      return { ...tournament, currentLevel: current, levelStartedAt: new Date(levelStartMs) };
    }
    return tournament;
  }

  /** Persiste la finalización de un torneo (idempotente). */
  private async complete(id: number): Promise<void> {
    await this.repository.update(
      { id },
      { status: TournamentStatus.COMPLETED, currentLevel: null, levelStartedAt: null },
    );
  }

  async start(id: number): Promise<Tournament> {
    const tournament = await this.findOne(id);
    if (![TournamentStatus.SCHEDULED, TournamentStatus.REGISTERING, TournamentStatus.PAUSED].includes(tournament.status)) {
      throw new BadRequestException('Tournament cannot be started from its current status');
    }
    const now = new Date();
    return super.update(id, {
      status: TournamentStatus.RUNNING,
      startedAt: tournament.startedAt ?? now,
      currentLevel: tournament.currentLevel ?? 0,
      levelStartedAt: tournament.levelStartedAt ?? now,
    } as DeepPartial<Tournament>);
  }

  async pause(id: number): Promise<Tournament> {
    const tournament = await this.findOne(id);
    if (tournament.status !== TournamentStatus.RUNNING) {
      throw new BadRequestException('Tournament is not running');
    }
    // Confirmar la posición en vivo antes de pausar (el estado persistido puede estar atrasado).
    const raw = await super.findOne(id);
    const live = await this.syncLiveStatus(raw);
    const patch: DeepPartial<Tournament> = { status: TournamentStatus.PAUSED };
    if (live.currentLevel != null && live.currentLevel !== raw.currentLevel) {
      patch.currentLevel = live.currentLevel;
      patch.levelStartedAt = live.levelStartedAt;
    }
    return super.update(id, patch);
  }

  async resume(id: number): Promise<Tournament> {
    const tournament = await this.findOne(id);
    if (tournament.status !== TournamentStatus.PAUSED) {
      throw new BadRequestException('Tournament is not paused');
    }
    return super.update(id, {
      status: TournamentStatus.RUNNING,
      levelStartedAt: new Date(),
    } as DeepPartial<Tournament>);
  }

  async nextLevel(id: number): Promise<Tournament> {
    // Estado persistido (sin sincronización): es la referencia para avanzar.
    const raw = await super.findOne(id);
    // Un torneo ya finalizado/cancelado no se avanza ni se "resucita".
    if (raw.status === TournamentStatus.COMPLETED || raw.status === TournamentStatus.CANCELLED) {
      return this.findOne(id);
    }
    const items = raw.blindStructure ?? [];
    if (items.length === 0) {
      throw new BadRequestException('Tournament has no blind structure');
    }
    const rawIndex = raw.currentLevel ?? 0;

    // Posición en vivo: el tiempo vence niveles/descansos automáticamente.
    const live = await this.syncLiveStatus(raw);

    // Si el tiempo ya avanzó al siguiente item (p. ej. un descanso), se confirma
    // ese estado y NO se avanza de nuevo: evita saltarse los descansos.
    if (live.currentLevel != null && live.currentLevel > rawIndex) {
      await this.repository.update(
        { id, currentLevel: rawIndex },
        { currentLevel: live.currentLevel, levelStartedAt: live.levelStartedAt },
      );
      return this.findOne(id);
    }

    // Avance manual: pasar al siguiente item (nivel o descanso).
    const current = live.currentLevel ?? rawIndex;
    const next = current + 1;
    if (next >= items.length) {
      // Avance condicional: si otra peticion ya completo el torneo, no se pisa.
      await this.repository.update(
        { id, currentLevel: current },
        {
          status: TournamentStatus.COMPLETED,
          currentLevel: null,
          levelStartedAt: null,
        },
      );
      return this.findOne(id);
    }
    await this.repository.update({ id, currentLevel: current }, { currentLevel: next, levelStartedAt: new Date() });
    return this.findOne(id);
  }
  // ---------------- Reservas ----------------

  /** Asientos disponibles por mesa. */
  private readonly SEATS_PER_TABLE = 9;

  /**
   * Asigna automaticamente una mesa (1..tableCount) y un asiento libre (1..SEATS_PER_TABLE)
   * al jugador aceptado: elige la primera mesa con espacio y el primer asiento libre.
   */
  private async autoAssignSeat(
    tournamentId: number,
    tableCount: number,
    excludeReservationId: number,
  ): Promise<{ tableNumber: number; seatNumber: number }> {
    const tables = Math.max(1, Math.min(tableCount || 1, 50));
    const accepted = await this.reservationsRepo.find({
      where: { tournamentId, status: ReservationStatus.ACCEPTED },
    });
    const occupied = new Set(
      accepted
        .filter((r) => r.id !== excludeReservationId && r.tableNumber != null && r.seatNumber != null)
        .map((r) => `${r.tableNumber}-${r.seatNumber}`),
    );

    for (let tableNumber = 1; tableNumber <= tables; tableNumber++) {
      for (let seatNumber = 1; seatNumber <= this.SEATS_PER_TABLE; seatNumber++) {
        if (!occupied.has(`${tableNumber}-${seatNumber}`)) {
          return { tableNumber, seatNumber };
        }
      }
    }
    throw new BadRequestException('No seats available: all tables are full');
  }

  /** Valida que una mesa/asiento manual no esté ocupada por otro jugador aceptado. */
  private async validateSeatAvailable(
    tournamentId: number,
    tableNumber: number,
    seatNumber: number,
    excludeReservationId: number,
  ): Promise<void> {
    const tournament = await this.repository.findOne({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tableNumber < 1 || tableNumber > (tournament.tableCount ?? 1)) {
      throw new BadRequestException(`Table must be between 1 and ${tournament.tableCount ?? 1}`);
    }
    if (seatNumber < 1 || seatNumber > this.SEATS_PER_TABLE) {
      throw new BadRequestException(`Seat must be between 1 and ${this.SEATS_PER_TABLE}`);
    }
    const conflict = await this.reservationsRepo.findOne({
      where: { tournamentId, status: ReservationStatus.ACCEPTED, tableNumber, seatNumber },
    });
    if (conflict && conflict.id !== excludeReservationId) {
      throw new BadRequestException(`Seat ${seatNumber} on table ${tableNumber} is already taken`);
    }
  }

  listReservations(tournamentId: number) {
    return this.reservationsRepo.find({ where: { tournamentId }, order: { createdAt: 'ASC' } });
  }

  myReservations(userId: number) {
    return this.reservationsRepo.find({
      where: { userId },
      relations: ['tournament'],
      order: { createdAt: 'DESC' },
    });
  }


  async createReservation(tournamentId: number, dto: CreateReservationDto) {
    const user = await this.usersRepo.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const tournament = await this.repository.findOne({ where: { id: tournamentId } });
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    // Un torneo ya no admite reservas si terminó, se canceló o su registro cerró
    // (registrationOpen = false o el late registration ya llegó a su nivel límite).
    if (tournament.status === TournamentStatus.COMPLETED || tournament.status === TournamentStatus.CANCELLED) {
      throw new BadRequestException('Cannot reserve: tournament is already finished or cancelled');
    }
    if (!tournament.registrationOpen) {
      throw new BadRequestException('Registration is closed for this tournament');
    }
    if (
      tournament.lateRegistrationEnabled &&
      tournament.lateRegistrationUntilLevel !== null &&
      tournament.currentLevel !== null &&
      tournament.currentLevel >= tournament.lateRegistrationUntilLevel
    ) {
      throw new BadRequestException('Late registration has ended for this tournament');
    }
    const existing = await this.reservationsRepo.findOne({ where: { tournamentId, userId: dto.userId } });
    if (existing) {
      throw new BadRequestException('Player already has a reservation for this tournament');
    }
    const reservation = this.reservationsRepo.create({
      tournamentId,
      userId: dto.userId,
      status: ReservationStatus.PENDING,
    });
    const saved = await this.reservationsRepo.save(reservation);
    return this.reservationsRepo.findOne({ where: { id: saved.id } });
  }

  async updateReservation(tournamentId: number, reservationId: number, dto: UpdateReservationDto) {
    const reservation = await this.reservationsRepo.findOne({ where: { id: reservationId, tournamentId } });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    reservation.status = dto.status;
    if (dto.stack !== undefined && dto.stack !== null) {
      reservation.stack = dto.stack;
    } else if (dto.status === ReservationStatus.ACCEPTED && reservation.stack == null) {
      const tournament = await this.findOne(tournamentId);
      reservation.stack = tournament.startingStack;
    }

    // Auto-assign table/seat when accepting a player
    if (dto.status === ReservationStatus.ACCEPTED) {
      const tournament = await this.repository.findOne({ where: { id: tournamentId } });
      if (!tournament) throw new NotFoundException('Tournament not found');

      if (dto.tableNumber != null && dto.seatNumber != null) {
        // Manual assignment — validate no conflict
        await this.validateSeatAvailable(tournamentId, dto.tableNumber, dto.seatNumber, reservationId);
        reservation.tableNumber = dto.tableNumber;
        reservation.seatNumber = dto.seatNumber;
      } else {
        // Auto-assign
        const seat = await this.autoAssignSeat(tournamentId, tournament.tableCount, reservationId);
        reservation.tableNumber = seat.tableNumber;
        reservation.seatNumber = seat.seatNumber;
      }
    } else if (dto.status === ReservationStatus.REJECTED || dto.status === ReservationStatus.PENDING) {
      // Clear assignment if rejected or reverted to pending
      reservation.tableNumber = null;
      reservation.seatNumber = null;
    }

    const saved = await this.reservationsRepo.save(reservation);
    return this.reservationsRepo.findOne({ where: { id: saved.id } });
  }

  /** Registra un rebuy (re-entrada): stack nuevo + incrementa contadores por jugador y del torneo. */
  async rebuy(tournamentId: number, reservationId: number, dto: RebuyDto) {
    const tournament = await this.findOne(tournamentId);
    if (!tournament.reEntryEnabled) {
      throw new BadRequestException('Re-entry is not enabled for this tournament');
    }
    const reservation = await this.reservationsRepo.findOne({ where: { id: reservationId, tournamentId } });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    if (reservation.status !== ReservationStatus.ACCEPTED) {
      throw new BadRequestException('Only accepted players can rebuy');
    }
    const current = reservation.reEntries ?? 0;
    if (tournament.maxReEntries !== null && tournament.maxReEntries !== 0 && current >= tournament.maxReEntries) {
      throw new BadRequestException('Max re-entries reached for this player');
    }
    reservation.reEntries = current + 1;
    reservation.stack = dto.stack ?? tournament.startingStack;

    // Re-assign table/seat on rebuy
    if (dto.tableNumber != null && dto.seatNumber != null) {
      await this.validateSeatAvailable(tournamentId, dto.tableNumber, dto.seatNumber, reservationId);
      reservation.tableNumber = dto.tableNumber;
      reservation.seatNumber = dto.seatNumber;
    } else {
      const seat = await this.autoAssignSeat(tournamentId, tournament.tableCount, reservationId);
      reservation.tableNumber = seat.tableNumber;
      reservation.seatNumber = seat.seatNumber;
    }

    const saved = await this.reservationsRepo.save(reservation);
    await this.repository.update(
      { id: tournamentId },
      { currentReEntries: (tournament.currentReEntries ?? 0) + 1 },
    );
    return this.reservationsRepo.findOne({ where: { id: saved.id } });
  }

  async removeReservation(tournamentId: number, reservationId: number) {
    const reservation = await this.reservationsRepo.findOne({ where: { id: reservationId, tournamentId } });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    await this.reservationsRepo.delete(reservationId);
  }

  // ---------------- Fichas del torneo ----------------

  listChips(tournamentId: number) {
    return this.tournamentChipsRepo.find({ where: { tournamentId }, order: { id: 'ASC' } });
  }

  async addChip(tournamentId: number, dto: CreateTournamentChipDto) {
    const chip = await this.chipsRepo.findOne({ where: { id: dto.chipId } });
    if (!chip) {
      throw new NotFoundException('Chip not found');
    }
    const existing = await this.tournamentChipsRepo.findOne({ where: { tournamentId, chipId: dto.chipId } });
    if (existing) {
      throw new BadRequestException('Chip already added to this tournament');
    }
    const tournamentChip = this.tournamentChipsRepo.create({
      tournamentId,
      chipId: dto.chipId,
      discardLevel: dto.discardLevel ?? null,
    });
    return this.tournamentChipsRepo.save(tournamentChip);
  }

  async removeChip(tournamentId: number, tournamentChipId: number) {
    const tournamentChip = await this.tournamentChipsRepo.findOne({
      where: { id: tournamentChipId, tournamentId },
    });
    if (!tournamentChip) {
      throw new NotFoundException('Tournament chip not found');
    }
    await this.tournamentChipsRepo.delete(tournamentChipId);
  }

  // ---------------- Premios ----------------

  listPrizes(tournamentId: number) {
    return this.prizesRepo.find({ where: { tournamentId }, order: { place: 'ASC' } });
  }

  async replacePrizes(tournamentId: number, dto: UpdatePrizesDto) {
    await this.findOne(tournamentId);
    await this.prizesRepo.delete({ tournamentId });
    const rows = dto.prizes.map((p) =>
      this.prizesRepo.create({ tournamentId, place: p.place, amount: p.amount }),
    );
    return this.prizesRepo.save(rows);
  }

  // ---------------- Jugadores ----------------

  listPlayers() {
    return this.usersRepo.find({ where: { role: UserRole.PLAYER }, order: { name: 'ASC' } });
  }

  private validateOptions(dto: Partial<CreateTournamentDto>): void {
    if (
      dto.paidPlacesType === 'percent' &&
      dto.paidPlacesValue !== undefined &&
      dto.paidPlacesValue !== null &&
      dto.paidPlacesValue > 100
    ) {
      throw new BadRequestException('paidPlacesValue cannot exceed 100 when using percent');
    }
    if (
      dto.adminFeeType === 'percent' &&
      dto.adminFeeValue !== undefined &&
      dto.adminFeeValue !== null &&
      dto.adminFeeValue > 100
    ) {
      throw new BadRequestException('adminFeeValue cannot exceed 100 when using percent');
    }
    if (dto.reEntryEnabled && (dto.maxReEntries === undefined || dto.maxReEntries === null || dto.maxReEntries < 0)) {
      throw new BadRequestException('maxReEntries is required when re-entry is enabled');
    }
    if (
      dto.lateRegistrationEnabled &&
      (dto.lateRegistrationUntilLevel === undefined || dto.lateRegistrationUntilLevel === null || dto.lateRegistrationUntilLevel < 1)
    ) {
      throw new BadRequestException('lateRegistrationUntilLevel is required when late registration is enabled');
    }
    if (dto.addOnEnabled) {
      if (dto.addOnAmount === undefined || dto.addOnAmount === null || dto.addOnAmount < 0) {
        throw new BadRequestException('addOnAmount is required when add-on is enabled');
      }
      if (dto.addOnStack === undefined || dto.addOnStack === null || dto.addOnStack < 1) {
        throw new BadRequestException('addOnStack is required when add-on is enabled');
      }
      if (dto.addOnUntilLevel === undefined || dto.addOnUntilLevel === null || dto.addOnUntilLevel < 1) {
        throw new BadRequestException('addOnUntilLevel is required when add-on is enabled');
      }
    }
  }
}