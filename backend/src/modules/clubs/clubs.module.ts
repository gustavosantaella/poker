import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PokerTable } from '../tables/entities/table.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { User } from '../users/entities/user.entity';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';
import { ClubInvitation } from './entities/club-invitation.entity';
import { ClubMember } from './entities/club-member.entity';
import { Club } from './entities/club.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Club, ClubMember, ClubInvitation, PokerTable, Tournament, User]),
  ],
  controllers: [ClubsController],
  providers: [ClubsService],
  exports: [ClubsService],
})
export class ClubsModule {}
