import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClubMemberRole } from './club-member.entity';
import { Club } from './club.entity';

export enum ClubInvitationStatus {
  /** Invitación enviada y aún no aceptada. */
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked',
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
}
