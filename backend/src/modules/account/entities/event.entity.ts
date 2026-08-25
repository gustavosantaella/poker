import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Eventos del sistema (tabla `events`).
 *
 * Actualmente se usa para registrar solicitudes de borrado de cuenta/datos
 * (`type = 'request-delete'`), pero la tabla está pensada para admitir otros
 * tipos de eventos en el futuro.
 *
 * El payload se guarda como JSON en texto (`json`) para mantener el esquema
 * estable: el contenido exacto depende del tipo de evento.
 */
@Entity('events')
export class AccountEvent extends BaseEntity {
  /** Tipo de evento. Por defecto: `request-delete`. */
  @Column({ type: 'varchar', length: 100, default: 'request-delete' })
  type: string;

  /** Payload del evento en formato JSON (almacenado como texto). */
  @Column({ type: 'text' })
  json: string;

  /** Usuario que originó el evento (null si la solicitud fue anónima). */
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  /** Id del usuario (null si no había sesión al generar el evento). */
  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;
}
