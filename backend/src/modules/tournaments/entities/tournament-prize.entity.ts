import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DecimalTransformer } from '../../../common/entities/decimal.transformer';
import { Tournament } from './tournament.entity';

@Entity('tournament_prizes')
export class TournamentPrize extends BaseEntity {
  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({ name: 'tournament_id', type: 'int' })
  tournamentId: number;

  @Column({ type: 'int' })
  place: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: DecimalTransformer })
  amount: number;
}