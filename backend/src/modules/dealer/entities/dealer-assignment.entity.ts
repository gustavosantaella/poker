import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Club } from '../../clubs/entities/club.entity';
import { PokerTable } from '../../tables/entities/table.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { User } from '../../users/entities/user.entity';

export enum DealerAssignmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

/** Asignación de un dealer a un torneo/mesa concreta para repartir. */
@Entity('dealer_assignments')
export class DealerAssignment extends BaseEntity {
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'dealer_id' })
  dealer: User;

  @Column({ name: 'dealer_id', type: 'int' })
  dealerId: number;

  @ManyToOne(() => Club, { eager: true })
  @JoinColumn({ name: 'club_id' })
  club: Club;

  @Column({ name: 'club_id', type: 'int' })
  clubId: number;

  @ManyToOne(() => Tournament, { nullable: true })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament | null;

  @Column({ name: 'tournament_id', type: 'int', nullable: true })
  tournamentId: number | null;

  @ManyToOne(() => PokerTable, { nullable: true })
  @JoinColumn({ name: 'table_id' })
  table: PokerTable | null;

  @Column({ name: 'table_id', type: 'int', nullable: true })
  tableId: number | null;

  /** Número de mesa dentro del torneo (1..tableCount). */
  @Column({ name: 'table_number', type: 'int', nullable: true })
  tableNumber: number | null;

  @Column({ type: 'enum', enum: DealerAssignmentStatus, default: DealerAssignmentStatus.ACTIVE })
  status: DealerAssignmentStatus;
}
