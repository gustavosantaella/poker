import { Module } from '@nestjs/common';
import { RealtimeService } from './realtime.service';

/**
 * Módulo de tiempo real (SSE). Solo expone RealtimeService: los consumidores
 * (TournamentsService, cron, controladores) publican y suscriben eventos.
 */
@Module({
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
