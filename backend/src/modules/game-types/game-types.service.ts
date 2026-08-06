import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/services/crud.service';
import { GameType } from './entities/game-type.entity';

@Injectable()
export class GameTypesService extends CrudService<GameType> {
  constructor(@InjectRepository(GameType) repository: Repository<GameType>) {
    super(repository);
  }

  async listActive(): Promise<GameType[]> {
    return this.repository.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }
}
