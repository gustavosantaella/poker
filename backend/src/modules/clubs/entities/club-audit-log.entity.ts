import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Club } from './club.entity';

/** Acciones auditables dentro de un club. */
export enum ClubAuditAction {
  CLUB_UPDATED = 'club.updated',
  CODE_ROTATED = 'club.code_rotated',
  OWNERSHIP_TRANSFERRED = 'club.ownership_transferred',
  COLLABORATOR_ROLE_CHANGED = 'collaborator.role_changed',
  COLLABORATOR_REMOVED = 'collaborator.removed',
  MEMBER_STATUS_CHANGED = 'member.status_changed',
  INVITATION_CREATED = 'invitation.created',
  INVITATION_RESENT = 'invitation.resent',
  INVITATION_REVOKED = 'invitation.revoked',
  INVITATION_ACCEPTED = 'invitation.accepted',
  INVITATION_EXPIRED = 'invitation.expired',
  // Caja y recaudación
  CASH_MOVEMENT_CREATED = 'cash.movement_created',
  CASH_MOVEMENT_UPDATED = 'cash.movement_updated',
  CASH_MOVEMENT_DELETED = 'cash.movement_deleted',
  CASH_COLLECTED = 'cash.collected',
  CASH_PAYOUT_REGISTERED = 'cash.payout_registered',
}


/**
 * Registro de auditoría del club: quién hizo qué y cuándo.
 *
 * Se escribe en cada acción sensible (invitar, cambiar permisos, retirar a un
 * colaborador, editar la configuración, rotar el código, traspasar la propiedad).
 * `summary` es la frase lista para mostrar en la app; `metadata` guarda detalles
 * estructurados (rol anterior/nuevo, correo invitado, etc.).
 */
@Entity('club_audit_logs')
export class ClubAuditLog extends BaseEntity {
  @ManyToOne(() => Club, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'club_id' })
  club: Club;

  @Index()
  @Column({ name: 'club_id', type: 'int' })
  clubId: number;

  /** Usuario que ejecutó la acción (null si fue el sistema). */
  @Column({ name: 'actor_user_id', type: 'int', nullable: true })
  actorUserId: number | null;

  /** Nombre del actor en el momento de la acción (para el historial). */
  @Column({ name: 'actor_name', type: 'varchar', length: 150, nullable: true })
  actorName: string | null;

  @Column({ type: 'varchar', length: 60 })
  action: ClubAuditAction;

  /** Tipo e id del recurso afectado (p. ej. `collaborator` / 12). */
  @Column({ name: 'target_type', type: 'varchar', length: 40, nullable: true })
  targetType: string | null;

  @Column({ name: 'target_id', type: 'int', nullable: true })
  targetId: number | null;

  /** Frase legible para el historial del club. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  summary: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;
}
