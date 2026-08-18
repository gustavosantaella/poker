import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { ChipsModule } from './modules/chips/chips.module';
import { ClubsModule } from './modules/clubs/clubs.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { GameTypesModule } from './modules/game-types/game-types.module';
import { RealtimeControllerModule } from './modules/realtime/realtime-controller.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { TablesModule } from './modules/tables/tables.module';
import { TournamentsModule } from './modules/tournaments/tournaments.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    // Throttling global: 100 requests/min por IP. Auth tiene un límite más estricto.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    // Cron para el avance automático de niveles de torneos en vivo.
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('nodeEnv') === 'production';
        return {
          type: 'mysql',
          host: config.get<string>('database.host'),
          port: config.get<number>('database.port'),
          username: config.get<string>('database.username'),
          password: config.get<string>('database.password'),
          database: config.get<string>('database.name'),
          autoLoadEntities: true,
          // Dev: synchronize crea/actualiza el esquema automáticamente.
          // Producción: solo migraciones (ver src/database/migrations).
          synchronize: !isProduction,
          migrationsRun: isProduction,
          migrations: [join(__dirname, 'database', 'migrations', '*{.ts,.js}')],
          charset: 'utf8mb4',
          extra: { connectionLimit: 10 },
        };
      },
    }),
    UsersModule,
    AuthModule,
    UploadsModule,
    GameTypesModule,
    ChipsModule,
    TablesModule,
    TournamentsModule,
    ClubsModule,
    DashboardModule,
    RealtimeModule,
    RealtimeControllerModule,
  ],
  controllers: [AppController],
  providers: [
    // Orden: primero autenticación, luego roles, luego throttling.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
