import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClubMemberRole } from './club-member.entity';
import { Club } from './club.entity';

export enum ClubInvitationStatus {
  /** Invitación enviada y aún no aceptada. */
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked',
  /** Caducada por fecha: hay que reenviarla para reactivarla. */
  EXPIRED = 'expired',
}

/**
 * Invitación para que un correo se una al club como colaborador con unos
 * permisos concretos (`role`). El admin del club comparte el `token` generado;
 * cuando el invitado se registra o inicia sesión con ese correo, la invitación
 * se acepta automáticamente y queda como colaborador del club.
 */
@Entity('club_invitations')
export class ClubInvitation extends BaseEntity {
  @ManyToOne(() => Club, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'club_id' })
  club: Club;

  @Column({ name: 'club_id', type: 'int' })
  clubId: number;

  /** Correo invitado (siempre en minúsculas). */
  @Index()
  @Column({ type: 'varchar', length: 255 })
  email: string;

  /** Permisos que tendrá el colaborador dentro del club. */
  @Column({ type: 'enum', enum: ClubMemberRole, default: ClubMemberRole.OPERATOR })
  role: ClubMemberRole;

  /** Código único que el admin comparte con el invitado. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  token: string;

  @Column({ type: 'enum', enum: ClubInvitationStatus, default: ClubInvitationStatus.PENDING })
  status: ClubInvitationStatus;

  /** Usuario del club que envió la invitación. */
  @Column({ name: 'invited_by_user_id', type: 'int', nullable: true })
  invitedByUserId: number | null;

  /** Usuario que aceptó la invitación. */
  @Column({ name: 'accepted_by_user_id', type: 'int', nullable: true })
  acceptedByUserId: number | null;

  @Column({ name: 'accepted_at', type: 'datetime', nullable: true })
  acceptedAt: Date | null;

  /** Caducidad de la invitación (a partir de aquí deja de poder aceptarse). */
  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt: Date | null;

  /** Último envío por correo y cuántas veces se ha enviado. */
  @Column({ name: 'last_sent_at', type: 'datetime', nullable: true })
  lastSentAt: Date | null;

  @Column({ name: 'send_count', type: 'int', default: 0 })
  sendCount: number;

  /** ¿Sigue siendo válida (pendiente y sin caducar)? */
  isUsable(now: Date = new Date()): boolean {
    if (this.status !== ClubInvitationStatus.PENDING) return false;
    return !this.expiresAt || this.expiresAt.getTime() > now.getTime();
  }

  /** ¿Ha caducado sin aceptarse? */
  isExpired(now: Date = new Date()): boolean {
    return this.status === ClubInvitationStatus.PENDING && !!this.expiresAt && this.expiresAt.getTime() <= now.getTime();
  }
}
