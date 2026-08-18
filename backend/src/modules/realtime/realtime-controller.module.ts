import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { UsersModule } from '../users/users.module';
import { RealtimeController } from './realtime.controller';
import { RealtimeModule } from './realtime.module';
import { SseAuthGuard } from './sse-auth.guard';

/**
 * Expone los endpoints SSE. Depende de TournamentsModule (que a su vez importa
 * RealtimeModule, sin ciclos porque RealtimeModule no importa nada).
 */
@Module({
  imports: [
    UsersModule,
    TournamentsModule,
    RealtimeModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret') as string,
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') as string } as JwtModuleOptions['signOptions'],
      }),
    }),
  ],
  controllers: [RealtimeController],
  providers: [SseAuthGuard],
})
export class RealtimeControllerModule {}
