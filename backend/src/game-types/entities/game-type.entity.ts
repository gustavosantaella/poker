import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('game_types')
export class GameType extends BaseEntity {
  @Column({ unique: true, length: 80 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 2 })
  holeCards: number;

  @Column({ type: 'int', default: 5 })
  communityCards: number;

  @Column({ default: true })
  isActive: boolean;
}
