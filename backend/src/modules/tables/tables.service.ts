import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/services/crud.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { PokerTable } from './entities/table.entity';

@Injectable()
export class TablesService extends CrudService<PokerTable> {
  constructor(@InjectRepository(PokerTable) repository: Repository<PokerTable>) {
    super(repository);
  }

  async create(dto: CreateTableDto): Promise<PokerTable> {
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

  private validateBlinds(smallBlind: number, bigBlind: number): void {
    if (bigBlind < smallBlind) {
      throw new BadRequestException('bigBlind must be greater than or equal to smallBlind');
    }
  }
}
