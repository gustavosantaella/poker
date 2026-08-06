import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Tournament } from './tournament.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('tournament_reservations')
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
}