import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('clubs')
export class Club extends BaseEntity {
  /** Código numérico único de 6 dígitos del club. */
  @Column({ type: 'varchar', length: 6, unique: true })
  code: string;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  /** Usuario admin del club (por defecto, quien lo crea). */
  @Column({ type: 'int' })
  adminUserId: number;

  /** Usuario que creó el club. */
  @Column({ type: 'int' })
  createdByUserId: number;
}
