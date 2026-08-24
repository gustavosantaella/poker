import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Club } from '../clubs/entities/club.entity';
import { ClubMember } from '../clubs/entities/club-member.entity';
import { TableReservation } from '../tables/entities/table-reservation.entity';
import { TournamentReservation } from '../tournaments/entities/tournament-reservation.entity';
import { User } from '../users/entities/user.entity';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

/**
 * Autoservicio de cuenta: permite a cualquier usuario autenticado (player o
 * admin) eliminar su propia cuenta y todos sus datos asociados.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, Club, ClubMember, TournamentReservation, TableReservation])],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
