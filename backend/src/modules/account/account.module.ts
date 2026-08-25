import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Club } from '../clubs/entities/club.entity';
import { ClubMember } from '../clubs/entities/club-member.entity';
import { TableReservation } from '../tables/entities/table-reservation.entity';
import { TournamentReservation } from '../tournaments/entities/tournament-reservation.entity';
import { User } from '../users/entities/user.entity';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AccountEvent } from './entities/event.entity';

/**
 * Autoservicio de cuenta: permite a cualquier usuario autenticado (player o
 * admin) eliminar su propia cuenta y todos sus datos asociados, y registrar
 * solicitudes de borrado de datos/cuenta (público) en la tabla `events`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Club, ClubMember, TournamentReservation, TableReservation, AccountEvent]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('jwt.secret') as string,
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') as string } as JwtModuleOptions['signOptions'],
      }),
    }),
  ],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
