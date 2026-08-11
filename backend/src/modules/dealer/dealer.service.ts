import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Club } from '../clubs/entities/club.entity';
import { TableReservation, TableReservationStatus } from '../tables/entities/table-reservation.entity';
import { PokerTable } from '../tables/entities/table.entity';
import {
  ReservationStatus,
  TournamentReservation,
} from '../tournaments/entities/tournament-reservation.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { AssignDto } from './dto/assign.dto';
import { StandUpPlayerDto } from './dto/stand-up-player.dto';
import { DealerAssignment, DealerAssignmentStatus } from './entities/dealer-assignment.entity';

export interface TableSeat {
  seat: number;
  player: { reservationId: number; userId: number; name: string; stack: number | null } | null;
}

@Injectable()
export class DealerService {
  constructor(
    @InjectRepository(DealerAssignment) private readonly assignmentsRepo: Repository<DealerAssignment>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>,
    @InjectRepository(PokerTable) private readonly tablesRepo: Repository<PokerTable>,
    @InjectRepository(Tournament) private readonly tournamentsRepo: Repository<Tournament>,
    @InjectRepository(TournamentReservation)
    private readonly tournamentResRepo: Repository<TournamentReservation>,
    @InjectRepository(TableReservation) private readonly tableResRepo: Repository<TableReservation>,
  ) {}

  private async requireDealer(dealerId: number): Promise<User> {
    const dealer = await this.usersRepo.findOne({ where: { id: dealerId } });
    if (!dealer || dealer.role !== UserRole.DEALER) {
      throw new ForbiddenException('Only dealers can use this endpoint');
    }
    if (!dealer.clubId) {
      throw new BadRequestException('The dealer is not associated with a club');
    }
    return dealer;
  }

  /** Contexto del dealer: su club + mesas + torneos (solo lectura). */
  async context(dealerId: number) {
    const dealer = await this.requireDealer(dealerId);
    const [club, tables, tournaments] = await Promise.all([
      this.clubsRepo.findOne({ where: { id: dealer.clubId! } }),
      this.tablesRepo.find({ where: { clubId: dealer.clubId! }, order: { createdAt: 'DESC' } }),
      this.tournamentsRepo.find({
        where: { clubId: dealer.clubId! },
        order: { startDate: 'DESC' },
      }),
    ]);
    return { club, tables, tournaments };
  }

  /** Asigna al dealer a un torneo/mesa para repartir. */
  async assign(dealerId: number, dto: AssignDto): Promise<DealerAssignment> {
    const dealer = await this.requireDealer(dealerId);

    if (dto.tournamentId != null) {
      const tournament = await this.tournamentsRepo.findOne({ where: { id: dto.tournamentId } });
      if (!tournament || tournament.clubId !== dealer.clubId) {
        throw new NotFoundException('Tournament not found in your club');
      }
      const tableNumber = dto.tableNumber ?? 1;
      if (tableNumber > (tournament.tableCount ?? 1)) {
        throw new BadRequestException('Invalid table number for this tournament');
      }
      await this.closeActive(dealerId);
      return this.assignmentsRepo.save(
        this.assignmentsRepo.create({
          dealerId,
          clubId: dealer.clubId!,
          tournamentId: tournament.id,
          tableId: null,
          tableNumber,
          status: DealerAssignmentStatus.ACTIVE,
        }),
      );
    }

    if (dto.tableId != null) {
      const table = await this.tablesRepo.findOne({ where: { id: dto.tableId } });
      if (!table || table.clubId !== dealer.clubId) {
        throw new NotFoundException('Table not found in your club');
      }
      await this.closeActive(dealerId);
      return this.assignmentsRepo.save(
        this.assignmentsRepo.create({
          dealerId,
          clubId: dealer.clubId!,
          tournamentId: null,
          tableId: table.id,
          tableNumber: null,
          status: DealerAssignmentStatus.ACTIVE,
        }),
      );
    }

    throw new BadRequestException('Select a tournament or a table to deal');
  }

  private async closeActive(dealerId: number) {
    await this.assignmentsRepo.update(
      { dealerId, status: DealerAssignmentStatus.ACTIVE },
      { status: DealerAssignmentStatus.COMPLETED },
    );
  }

  /** Asignación activa del dealer con los asientos ocupados de la mesa. */
  async current(dealerId: number) {
    await this.requireDealer(dealerId);
    const assignment = await this.assignmentsRepo.findOne({
      where: { dealerId, status: DealerAssignmentStatus.ACTIVE },
      relations: ['tournament', 'table'],
    });
    if (!assignment) {
      return { assignment: null, seats: [] };
    }
    return { assignment, seats: await this.buildSeats(assignment) };
  }

  private async buildSeats(assignment: DealerAssignment): Promise<TableSeat[]> {
    if (assignment.tournamentId && assignment.tableNumber) {
      const reservations = await this.tournamentResRepo.find({
        where: {
          tournamentId: assignment.tournamentId,
          tableNumber: assignment.tableNumber,
          status: ReservationStatus.ACCEPTED,
        },
      });
      const total = assignment.tournament?.tableCount ?? reservations.length;
      return Array.from({ length: total }, (_, i) => {
        const res = reservations.find((r) => r.seatNumber === i + 1);
        return {
          seat: i + 1,
          player: res
            ? {
                reservationId: res.id,
                userId: res.userId,
                name: res.user?.name ?? `#${res.userId}`,
                stack: res.stack,
              }
            : null,
        };
      });
    }

    if (assignment.tableId) {
      const reservations = await this.tableResRepo.find({
        where: { tableId: assignment.tableId, status: TableReservationStatus.CONFIRMED },
      });
      return reservations.map((res, i) => ({
        seat: i + 1,
        player: {
          reservationId: res.id,
          userId: res.userId,
          name: res.user?.name ?? `#${res.userId}`,
          stack: null,
        },
      }));
    }

    return [];
  }

  /** Finaliza la asignación activa del dealer. */
  async complete(dealerId: number) {
    await this.requireDealer(dealerId);
    const assignment = await this.assignmentsRepo.findOne({
      where: { dealerId, status: DealerAssignmentStatus.ACTIVE },
    });
    if (!assignment) {
      throw new BadRequestException('There is no active assignment');
    }
    assignment.status = DealerAssignmentStatus.COMPLETED;
    await this.assignmentsRepo.save(assignment);
    return { ok: true };
  }

  /** "Levantar" a un jugador de la mesa (lo saca del asiento). */
  async standUpPlayer(dealerId: number, dto: StandUpPlayerDto) {
    await this.requireDealer(dealerId);
    const assignment = await this.assignmentsRepo.findOne({
      where: { dealerId, status: DealerAssignmentStatus.ACTIVE },
    });
    if (!assignment) {
      throw new BadRequestException('There is no active assignment');
    }

    if (assignment.tournamentId != null && dto.reservationId != null) {
      const reservation = await this.tournamentResRepo.findOne({
        where: { id: dto.reservationId, tournamentId: assignment.tournamentId },
      });
      if (!reservation) throw new NotFoundException('Player reservation not found');
      reservation.status = ReservationStatus.STOOD_UP;
      reservation.tableNumber = null;
      reservation.seatNumber = null;
      reservation.stack = null;
      await this.tournamentResRepo.save(reservation);
      return { ok: true, name: reservation.user?.name };
    }

    if (assignment.tableId != null && dto.tableReservationId != null) {
      const reservation = await this.tableResRepo.findOne({
        where: { id: dto.tableReservationId, tableId: assignment.tableId },
      });
      if (!reservation) throw new NotFoundException('Player reservation not found');
      await this.tableResRepo.delete(reservation.id);
      return { ok: true, name: reservation.user?.name };
    }

    throw new BadRequestException('Select a player to stand up');
  }
}