import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PokerTable } from '../tables/entities/table.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';
import { ClubMember } from './entities/club-member.entity';
import { Club } from './entities/club.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Club, ClubMember, PokerTable, Tournament])],
  controllers: [ClubsController],
  providers: [ClubsService],
  exports: [ClubsService],
})
export class ClubsModule {}
