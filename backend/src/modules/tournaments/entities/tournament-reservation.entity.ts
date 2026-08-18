import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Tournament } from './tournament.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  /** "Levantado": como eliminado del torneo (no cuenta como activo) pero conserva opcion de rebuy. */
  STOOD_UP = 'stood_up',
  /** "Eliminado": fuera del torneo sin rebuy. Su reserva se conserva (sigue contando en reservas). */
  ELIMINATED = 'eliminated',
}

/**
 * - Un jugador solo puede tener UNA reserva por torneo.
 * - Una mesa/asiento solo puede estar ocupada por un jugador aceptado a la vez
 *   (MySQL permite múltiples NULLs, por lo que las filas pendientes/levantadas
 *   con mesa/asiento null no colisionan).
 */
@Entity('tournament_reservations')
@Index('UQ_tournament_reservations_tournament_user', ['tournamentId', 'userId'], { unique: true })
@Index('UQ_tournament_reservations_seat', ['tournamentId', 'tableNumber', 'seatNumber'], { unique: true })
export class TournamentReservation extends BaseEntity {
  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({ name: 'tournament_id', type: 'int' })
  tournamentId: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  /** Stack con el que entrara el jugador. Null = usa el startingStack del torneo. */
  @Column({ type: 'int', nullable: true })
  stack: number | null;

  /** Cantidad de rebuys (re-entradas) realizados por el jugador. */
  @Column({ type: 'int', default: 0 })
  reEntries: number = 0;

  /** Mesa asignada (1..tableCount). */
  @Column({ type: 'int', nullable: true })
  tableNumber: number | null;

  /** Asiento en la mesa (1..9). */
  @Column({ type: 'int', nullable: true })
  seatNumber: number | null;
}
