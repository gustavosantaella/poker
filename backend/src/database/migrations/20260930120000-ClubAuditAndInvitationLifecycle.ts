import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Métricas de negocio, auditoría y ciclo de vida de las invitaciones:
 * - `club_audit_logs`: historial de acciones sensibles del club (invitar, cambiar
 *   permisos, retirar colaboradores, rotar el código, traspasar la propiedad...).
 * - `club_invitations`: caducidad (`expires_at`), último envío (`last_sent_at`) y
 *   contador de reenvíos (`send_count`), más el estado `expired`.
 */
export class ClubAuditAndInvitationLifecycle20260930120000 implements MigrationInterface {
  name = 'ClubAuditAndInvitationLifecycle20260930120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`club_audit_logs\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`club_id\` int NOT NULL,
        \`actor_user_id\` int NULL,
        \`actor_name\` varchar(150) NULL,
        \`action\` varchar(60) NOT NULL,
        \`target_type\` varchar(40) NULL,
        \`target_id\` int NULL,
        \`summary\` varchar(255) NULL,
        \`metadata\` json NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_club_audit_logs_club\` (\`club_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );

    await queryRunner.query(
      `ALTER TABLE \`club_audit_logs\` ADD CONSTRAINT \`FK_club_audit_logs_club\` FOREIGN KEY (\`club_id\`) REFERENCES \`clubs\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Las invitaciones ya existentes se consideran sin caducidad ni envíos previos.
    await queryRunner.query(
      `ALTER TABLE \`club_invitations\`
        ADD \`expires_at\` datetime NULL,
        ADD \`last_sent_at\` datetime NULL,
        ADD \`send_count\` int NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(
      `ALTER TABLE \`club_invitations\` MODIFY \`status\` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Ojo: al quitar `expired` del enum hay que devolver esas filas a `pending`.
    await queryRunner.query(
      `UPDATE \`club_invitations\` SET \`status\` = 'pending' WHERE \`status\` = 'expired'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`club_invitations\` MODIFY \`status\` enum('pending','accepted','revoked') NOT NULL DEFAULT 'pending'`,
    );

    await queryRunner.query(
      `ALTER TABLE \`club_invitations\` DROP COLUMN \`send_count\`, DROP COLUMN \`last_sent_at\`, DROP COLUMN \`expires_at\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`club_audit_logs\` DROP FOREIGN KEY \`FK_club_audit_logs_club\``,
    );
    await queryRunner.query(`DROP TABLE \`club_audit_logs\``);
  }
}
