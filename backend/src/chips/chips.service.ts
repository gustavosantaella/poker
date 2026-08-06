import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../common/services/crud.service';
import { Chip } from './entities/chip.entity';

@Injectable()
export class ChipsService extends CrudService<Chip> {
  constructor(@InjectRepository(Chip) repository: Repository<Chip>) {
    super(repository);
  }
}
