import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { TournamentsService } from './tournaments.service';

/**
 * Cron que persiste el avance de niveles de los torneos RUNNING (cada 10s) y
 * notifica los cambios por SSE. Antes el avance se calculaba en las lecturas;
 * ahora una lectura nunca escribe: el estado en vivo es consistente para todos
 * los clientes conectados.
 */
@Injectable()
export class TournamentClockService {
  private readonly logger = new Logger(TournamentClockService.name);

  constructor(private readonly tournamentsService: TournamentsService) {}

  @Interval(10_000)
  async tick(): Promise<void> {
    try {
      await this.tournamentsService.tickLiveTournaments();
    } catch (error) {
      this.logger.error(
        `Error ticking live tournaments: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
