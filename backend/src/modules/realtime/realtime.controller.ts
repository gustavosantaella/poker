import { Controller, Param, ParseIntPipe, Sse, UseGuards } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Public } from '../../common/decorators/public.decorator';
import { TournamentsService } from '../tournaments/tournaments.service';
import { RealtimeEvent, RealtimeService } from './realtime.service';
import { SseAuthGuard } from './sse-auth.guard';

@Controller('realtime')
export class RealtimeController {
  constructor(
    private readonly realtime: RealtimeService,
    private readonly tournaments: TournamentsService,
  ) {}

  /** SSE global: eventos de cualquier torneo (p. ej. el listado del admin). */
  @Public()
  @UseGuards(SseAuthGuard)
  @Sse('events')
  globalEvents(): Observable<MessageEvent> {
    return this.stream(null);
  }

  /** SSE de un torneo concreto: snapshot inicial + eventos en vivo. */
  @Public()
  @UseGuards(SseAuthGuard)
  @Sse('tournaments/:id/events')
  tournamentEvents(@Param('id', ParseIntPipe) id: number): Observable<MessageEvent> {
    return this.stream(id);
  }

  private stream(tournamentId: number | null): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const send = (event: RealtimeEvent) =>
        subscriber.next({
          type: event.type,
          data: JSON.stringify(event.data),
        } as MessageEvent);

      const unsubscribe =
        tournamentId == null
          ? this.realtime.subscribeGlobal(send)
          : this.realtime.subscribe(tournamentId, send);

      // Snapshot inicial del estado actual del torneo.
      if (tournamentId != null) {
        void this.tournaments
          .findOne(tournamentId)
          .then((tournament) => {
            subscriber.next({
              type: 'tournament:updated',
              data: JSON.stringify(tournament),
            } as MessageEvent);
          })
          .catch(() => {
            // El torneo no existe: se deja la conexión sin snapshot (el cliente
            // seguirá recibiendo eventos si se crea después).
          });
      }

      // Heartbeat: mantiene viva la conexión (proxies/idle timeouts).
      const heartbeat = setInterval(() => {
        subscriber.next({
          type: 'heartbeat',
          data: JSON.stringify({ ts: Date.now() }),
        } as MessageEvent);
      }, 25_000);

      return () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    });
  }
}
