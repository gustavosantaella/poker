import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('chips')
export class Chip extends BaseEntity {
  @Column({ type: 'int' })
  value: number;

  @Column({ length: 50 })
  color: string;

  @Column({ length: 9 })
  hexColor: string;

  @Column({ type: 'int', nullable: true })
  quantity: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ default: true })
  isActive: boolean;
}
