import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Chip } from '../../chips/entities/chip.entity';
import { Tournament } from './tournament.entity';

@Entity('tournament_chips')
export class TournamentChip extends BaseEntity {
  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({ name: 'tournament_id', type: 'int' })
  tournamentId: number;

  @ManyToOne(() => Chip, { eager: true })
  @JoinColumn({ name: 'chip_id' })
  chip: Chip;

  @Column({ name: 'chip_id', type: 'int' })
  chipId: number;

  @Column({ type: 'int', nullable: true })
  discardLevel: number | null;
}