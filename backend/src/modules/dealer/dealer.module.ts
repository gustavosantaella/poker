import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Club } from '../clubs/entities/club.entity';
import { TableReservation } from '../tables/entities/table-reservation.entity';
import { PokerTable } from '../tables/entities/table.entity';
import { TournamentReservation } from '../tournaments/entities/tournament-reservation.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { User } from '../users/entities/user.entity';
import { DealerController } from './dealer.controller';
import { DealerService } from './dealer.service';
import { DealerAssignment } from './entities/dealer-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DealerAssignment,
      User,
      Club,
      PokerTable,
      Tournament,
      TournamentReservation,
      TableReservation,
    ]),
    TournamentsModule,
  ],
  controllers: [DealerController],
  providers: [DealerService],
  exports: [DealerService],
})
export class DealerModule {}
