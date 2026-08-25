import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { del } from '@vercel/blob';
import { User } from '../users/entities/user.entity';
import { Club } from '../clubs/entities/club.entity';
import { ClubMember } from '../clubs/entities/club-member.entity';
import { TournamentReservation, ReservationStatus } from '../tournaments/entities/tournament-reservation.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { TableReservation } from '../tables/entities/table-reservation.entity';
import { AccountEvent } from './entities/event.entity';
import { RequestDeletionDto } from './dto/request-deletion.dto';

const BLOB_HOST_SUFFIX = '.blob.vercel-storage.com';

/** Tipo de evento usado para registrar solicitudes de borrado de cuenta/datos. */
export const EVENT_TYPE_REQUEST_DELETE = 'request-delete';


/**
 * Elimina la cuenta del usuario autenticado y TODOS sus datos asociados, de
 * forma atómica:
 *  - reservas de mesas y de torneos (FK a `users` sin CASCADE);
 *  - membresías de clubes (FK a `users` sin CASCADE);
 *  - los clubes que el usuario administra/creó (sus miembros caen por CASCADE);
 *  - avatar en Vercel Blob (best-effort);
 *  - la propia fila de `users`.
 *
 * Los contadores denormalizados de los torneos (reservedPlayers, currentPlayers,
 * currentReEntries) se recalculan dentro de la misma transacción.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    @InjectRepository(AccountEvent) private readonly eventsRepo: Repository<AccountEvent>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registra en `events` una solicitud de borrado de cuenta/datos
   * (`type='request-delete'`). El endpoint es público: si llega un JWT válido
   * en el header Authorization se guarda el `user_id` (y el email del token);
   * si no hay sesión, `user_id` queda en null.
   */
  async requestDeletion(
    authorization: string | undefined,
    dto: RequestDeletionDto,
  ): Promise<{ message: string }> {
    let userId: number | null = null;
    let tokenEmail: string | null = null;

    if (authorization?.startsWith('Bearer ')) {
      const token = authorization.slice('Bearer '.length).trim();
      try {
        const payload = await this.jwtService.verifyAsync<{ sub?: number; email?: string }>(token);
        userId = typeof payload.sub === 'number' ? payload.sub : null;
        tokenEmail = typeof payload.email === 'string' ? payload.email : null;
      } catch {
        // Token inválido o expirado: se registra la solicitud como anónima.
        this.logger.warn('request-delete called with an invalid/expired token; recorded as anonymous');
      }
    }

    const event = this.eventsRepo.create({
      type: EVENT_TYPE_REQUEST_DELETE,
      json: JSON.stringify({
        email: dto.email?.trim() || tokenEmail || null,
        reason: dto.reason?.trim() || null,
      }),
      userId,
    });
    const saved = await this.eventsRepo.save(event);

    this.logger.log(
      `Account deletion requested (event id=${saved.id}, userId=${userId ?? 'null'})`,
    );
    return { message: 'Account deletion request received' };
  }

  async deleteAccount(user: User): Promise<{ message: string }> {
    await this.deleteAvatarBlob(user.photoUrl);

    await this.dataSource.transaction(async (manager) => {
      // 1) Reservas de mesas del usuario.
      await manager.delete(TableReservation, { userId: user.id });

      // 2) Reservas de torneos del usuario + recálculo de contadores del torneo.
      const tournamentRows = await manager
        .createQueryBuilder(TournamentReservation, 'r')
        .select('DISTINCT r.tournament_id', 'tournamentId')
        .where('r.user_id = :userId', { userId: user.id })
        .getRawMany<{ tournamentId: number }>();
      await manager.delete(TournamentReservation, { userId: user.id });
      for (const row of tournamentRows) {
        await this.refreshTournamentCounters(manager, row.tournamentId);
      }

      // 3) Membresías de clubes del usuario.
      await manager.delete(ClubMember, { userId: user.id });

      // 4) Clubes donde el usuario es admin o creador: se eliminan por completo
      //    (no existe mecanismo de transferencia). Sus miembros se borran por CASCADE.
      const ownedClubs = await manager.find(Club, {
        where: [{ adminUserId: user.id }, { createdByUserId: user.id }],
        select: { id: true },
      });
      if (ownedClubs.length > 0) {
        await manager.delete(Club, ownedClubs.map((club) => club.id));
      }

      // 5) La cuenta.
      await manager.delete(User, user.id);
    });

    this.logger.log(`Account deleted for ${user.email} (id=${user.id})`);
    return { message: 'Account deleted successfully' };
  }

  /** Igual que TournamentsService.refreshCounters: recuenta desde las reservas. */
  private async refreshTournamentCounters(manager: EntityManager, tournamentId: number): Promise<void> {
    const [reservedPlayers, currentPlayers, reEntryRow] = await Promise.all([
      manager.count(TournamentReservation, { where: { tournamentId } }),
      manager.count(TournamentReservation, {
        where: { tournamentId, status: ReservationStatus.ACCEPTED },
      }),
      manager
        .createQueryBuilder(TournamentReservation, 'r')
        .select('COALESCE(SUM(r.reEntries), 0)', 'total')
        .where('r.tournament_id = :id', { id: tournamentId })
        .getRawOne(),
    ]);
    await manager.update(
      Tournament,
      { id: tournamentId },
      {
        reservedPlayers,
        currentPlayers,
        currentReEntries: Number(reEntryRow?.total ?? 0),
      },
    );
  }

  /** Borra el avatar de Vercel Blob si existe (best-effort, no bloquea el borrado). */
  private async deleteAvatarBlob(photoUrl: string | null | undefined): Promise<void> {
    if (!photoUrl || !photoUrl.includes(BLOB_HOST_SUFFIX)) return;
    const storeId = this.config.get<string>('blob.storeId')?.trim() ?? '';
    const readWriteToken = this.config.get<string>('blob.readWriteToken')?.trim() ?? '';
    if (!storeId && !readWriteToken) return;
    try {
      await del(photoUrl, storeId ? { storeId } : { token: readWriteToken });
    } catch (error) {
      this.logger.warn(`Could not delete avatar blob ${photoUrl}: ${error instanceof Error ? error.message : error}`);
    }
  }
}
