import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chip } from './entities/chip.entity';
import { ChipsController } from './chips.controller';
import { ChipsService } from './chips.service';

@Module({
  imports: [TypeOrmModule.forFeature([Chip])],
  controllers: [ChipsController],
  providers: [ChipsService],
  exports: [ChipsService],
})
export class ChipsModule {}
