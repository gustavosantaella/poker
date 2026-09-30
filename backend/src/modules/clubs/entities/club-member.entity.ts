import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Club } from './club.entity';

/**
 * Permisos del usuario dentro del club.
 * Los tres primeros son "colaboradores" (equipo del club); `member` es un jugador
 * que se unió por código y no puede gestionar nada.
 */
export enum ClubMemberRole {
  /** Dueño/administrador: configura el club, invita colaboradores y asigna permisos. */
  ADMIN = 'admin',
  /** Operador: gestiona torneos y mesas del club. */
  OPERATOR = 'operator',
  /** Cajero: gestiona cobros, reservas y buy-ins. */
  CASHIER = 'cashier',
  /** Miembro jugador: pertenece al club sin permisos de gestión. */
  MEMBER = 'member',
}

export enum ClubMemberStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('club_members')
export class ClubMember extends BaseEntity {
  @ManyToOne(() => Club, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'club_id' })
  club: Club;

  @Column({ name: 'club_id', type: 'int' })
  clubId: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ type: 'enum', enum: ClubMemberStatus, default: ClubMemberStatus.PENDING })
  status: ClubMemberStatus;

  /** Permisos dentro del club (por defecto, miembro jugador). */
  @Column({ type: 'enum', enum: ClubMemberRole, default: ClubMemberRole.MEMBER })
  role: ClubMemberRole;
}
