import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DecimalTransformer } from '../../../common/entities/decimal.transformer';

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

  /** Ubicación geográfica del club (opcional). Decimal(10,7) ≈ precisión de centímetros. */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: DecimalTransformer })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: DecimalTransformer })
  longitude: number | null;

  /** Redes sociales del club (opcionales): handle de Instagram, página de Facebook, WhatsApp y sitio web. */
  @Column({ type: 'varchar', length: 180, nullable: true })
  instagram: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  facebook: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  whatsapp: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  /** Usuario admin del club (por defecto, quien lo crea). */
  @Column({ type: 'int' })
  adminUserId: number;

  /** Usuario que creó el club. */
  @Column({ type: 'int' })
  createdByUserId: number;
}
