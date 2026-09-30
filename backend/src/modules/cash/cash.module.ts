import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClubsModule } from '../clubs/clubs.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TournamentReservation } from '../tournaments/entities/tournament-reservation.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { User } from '../users/entities/user.entity';
import { CashController } from './cash.controller';
import { CashService } from './cash.service';
import { ClubCashMovement } from './entities/club-cash-movement.entity';

/**
 * Caja y recaudación del club. Depende de ClubsModule para resolver los permisos
 * por club (rol de cajero o superior) y de RealtimeModule para avisar a los
 * paneles abiertos de que el dinero cambió.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ClubCashMovement, Tournament, TournamentReservation, User]),
    ClubsModule,
    RealtimeModule,
  ],
  controllers: [CashController],
  providers: [CashService],
  exports: [CashService],
})
export class CashModule {}
