import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chip } from '../chips/entities/chip.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { User } from '../users/entities/user.entity';
import { Tournament } from './entities/tournament.entity';
import { TournamentChip } from './entities/tournament-chip.entity';
import { TournamentPrize } from './entities/tournament-prize.entity';
import { TournamentReservation } from './entities/tournament-reservation.entity';
import { TournamentClockService } from './tournament-clock.service';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tournament, TournamentReservation, TournamentChip, TournamentPrize, Chip, User]), RealtimeModule],
  controllers: [TournamentsController],
  providers: [TournamentsService, TournamentClockService],
  exports: [TournamentsService],
})
export class TournamentsModule {}

