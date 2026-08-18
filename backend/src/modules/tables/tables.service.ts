import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CrudService } from '../../common/services/crud.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { CreateTableReservationDto } from './dto/create-table-reservation.dto';
import { PokerTable } from './entities/table.entity';
import { TableReservation, TableReservationStatus } from './entities/table-reservation.entity';

@Injectable()
export class TablesService extends CrudService<PokerTable> {
  constructor(
    @InjectRepository(PokerTable) repository: Repository<PokerTable>,
    @InjectRepository(TableReservation) private readonly reservationsRepo: Repository<TableReservation>,
  ) {
    super(repository);
  }

  async create(dto: CreateTableDto & { createdByUserId?: number }): Promise<PokerTable> {
    this.validateBlinds(dto.smallBlind, dto.bigBlind);
    if (dto.maxBuyIn < dto.minBuyIn) {
      throw new BadRequestException('maxBuyIn must be greater than or equal to minBuyIn');
    }
    return super.create(dto);
  }

  async update(id: number, dto: UpdateTableDto): Promise<PokerTable> {
    if (dto.smallBlind !== undefined && dto.bigBlind !== undefined) {
      this.validateBlinds(dto.smallBlind, dto.bigBlind);
    }
    if (dto.minBuyIn !== undefined && dto.maxBuyIn !== undefined && dto.maxBuyIn < dto.minBuyIn) {
      throw new BadRequestException('maxBuyIn must be greater than or equal to minBuyIn');
    }
    return super.update(id, dto);
  }

  // ---- Reservas de mesa ----

  myReservations(userId: number) {
    return this.reservationsRepo.find({
      where: { userId },
      relations: ['table'],
      order: { createdAt: 'DESC' },
    });
  }


  async createReservation(tableId: number, dto: CreateTableReservationDto) {
    await this.findOne(tableId);
    const existing = await this.reservationsRepo.findOne({
      where: { tableId, userId: dto.userId, status: Not(TableReservationStatus.CANCELLED) },
    });
    if (existing) {
      throw new BadRequestException('This player already has a reservation on this table');
    }
    const reservation = this.reservationsRepo.create({ tableId, userId: dto.userId });
    return this.reservationsRepo.save(reservation);
  }

  async listReservations(tableId: number) {
    await this.findOne(tableId);
    return this.reservationsRepo.find({ where: { tableId }, order: { createdAt: 'DESC' } });
  }

  async removeReservation(
    tableId: number,
    reservationId: number,
    actor?: { userId: number; role: string },
  ) {
    const reservation = await this.reservationsRepo.findOne({ where: { id: reservationId, tableId } });
    if (!reservation) {
      throw new NotFoundException('Table reservation not found');
    }
    // Un player solo puede cancelar su propia reserva.
    if (actor && actor.role === 'player' && reservation.userId !== actor.userId) {
      throw new ForbiddenException('You can only remove your own reservation');
    }
    await this.reservationsRepo.delete(reservationId);
  }

  private validateBlinds(smallBlind: number, bigBlind: number): void {
    if (bigBlind < smallBlind) {
      throw new BadRequestException('bigBlind must be greater than or equal to smallBlind');
    }
  }
}