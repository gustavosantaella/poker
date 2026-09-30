import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { PokerTable } from '../tables/entities/table.entity';
import { TournamentReservation } from '../tournaments/entities/tournament-reservation.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { User } from '../users/entities/user.entity';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';
import { ClubAuditLog } from './entities/club-audit-log.entity';
import { ClubInvitation } from './entities/club-invitation.entity';
import { ClubMember } from './entities/club-member.entity';
import { Club } from './entities/club.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Club,
      ClubMember,
      ClubInvitation,
      ClubAuditLog,
      PokerTable,
      Tournament,
      TournamentReservation,
      User,
    ]),
    MailModule,
    RealtimeModule,
  ],
  controllers: [ClubsController],
  providers: [ClubsService],
  exports: [ClubsService],
})
export class ClubsModule {}

