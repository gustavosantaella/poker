import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
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
    const counts = await this.getReservationCounts(id);
    return { ...tournament, reservedCount: counts.reserved, playersCount: counts.playing };
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
    return super.update(id, { status: TournamentStatus.PAUSED } as DeepPartial<Tournament>);
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
    const tournament = await this.findOne(id);
    const items = tournament.blindStructure ?? [];
    if (items.length === 0) {
      throw new BadRequestException('Tournament has no blind structure');
    }
    const current = tournament.currentLevel ?? 0;
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

  listReservations(tournamentId: number) {
    return this.reservationsRepo.find({ where: { tournamentId }, order: { createdAt: 'ASC' } });
  }

  async createReservation(tournamentId: number, dto: CreateReservationDto) {
    const user = await this.usersRepo.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
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
      // Por defecto, el jugador entra con el stack configurado en el torneo.
      const tournament = await this.findOne(tournamentId);
      reservation.stack = tournament.startingStack;
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