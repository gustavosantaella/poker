import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dashboard del club:
 * - `clubs`: ubicación (latitud/longitud) y redes sociales (Instagram, Facebook,
 *   WhatsApp, sitio web) opcionales.
 * - `club_members`: permisos del colaborador dentro del club (`role`).
 * - `club_invitations`: invitaciones por correo para unirse como colaborador con
 *   unos permisos determinados.
 */
export class AddClubDashboard20260930000000 implements MigrationInterface {
  name = 'AddClubDashboard20260930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clubs\` ADD \`latitude\` decimal(10,7) NULL, ADD \`longitude\` decimal(10,7) NULL, ADD \`instagram\` varchar(180) NULL, ADD \`facebook\` varchar(180) NULL, ADD \`whatsapp\` varchar(40) NULL, ADD \`website\` varchar(255) NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE \`club_members\` ADD \`role\` enum('admin','operator','cashier','member') NOT NULL DEFAULT 'member'`,
    );

    // OJO: la migración inicial creó `club_members` con columnas camelCase
    // (`clubId`/`userId`) mientras las entidades usan snake_case. Se detecta el
    // nombre real para que el INSERT funcione en cualquier base de datos.
    const clubColumns = await queryRunner.query(
      `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'club_members'
         AND COLUMN_NAME IN ('club_id', 'clubId')`,
    );
    const userColumns = await queryRunner.query(
      `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'club_members'
         AND COLUMN_NAME IN ('user_id', 'userId')`,
    );
    const clubColumn: string = clubColumns?.[0]?.name ?? 'club_id';
    const userColumn: string = userColumns?.[0]?.name ?? 'user_id';

    // El admin de cada club existente pasa a ser colaborador con permisos totales.
    await queryRunner.query(
      `INSERT INTO \`club_members\` (\`${clubColumn}\`, \`${userColumn}\`, \`status\`, \`role\`, \`createdAt\`, \`updatedAt\`)
       SELECT c.\`id\`, c.\`adminUserId\`, 'accepted', 'admin', NOW(6), NOW(6)
       FROM \`clubs\` c
       WHERE c.\`adminUserId\` IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM \`club_members\` m
           WHERE m.\`${clubColumn}\` = c.\`id\` AND m.\`${userColumn}\` = c.\`adminUserId\`
         )`,
    );

    // Y si ya tenía fila (creada antes de existir los roles), se le dan permisos totales.
    await queryRunner.query(
      `UPDATE \`club_members\` m
       INNER JOIN \`clubs\` c ON m.\`${clubColumn}\` = c.\`id\`
       SET m.\`role\` = 'admin', m.\`status\` = 'accepted'
       WHERE m.\`${userColumn}\` = c.\`adminUserId\` AND m.\`role\` <> 'admin'`,
    );

    await queryRunner.query(
      `CREATE TABLE \`club_invitations\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`club_id\` int NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`role\` enum('admin','operator','cashier','member') NOT NULL DEFAULT 'operator',
        \`token\` varchar(64) NOT NULL,
        \`status\` enum('pending','accepted','revoked') NOT NULL DEFAULT 'pending',
        \`invited_by_user_id\` int NULL,
        \`accepted_by_user_id\` int NULL,
        \`accepted_at\` datetime NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_club_invitations_token\` (\`token\`),
        INDEX \`IDX_club_invitations_club\` (\`club_id\`),
        INDEX \`IDX_club_invitations_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );

    await queryRunner.query(
      `ALTER TABLE \`club_invitations\` ADD CONSTRAINT \`FK_club_invitations_club\` FOREIGN KEY (\`club_id\`) REFERENCES \`clubs\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`club_invitations\` DROP FOREIGN KEY \`FK_club_invitations_club\``,
    );
    await queryRunner.query(`DROP TABLE \`club_invitations\``);
    await queryRunner.query(`ALTER TABLE \`club_members\` DROP COLUMN \`role\``);
    await queryRunner.query(
      `ALTER TABLE \`clubs\` DROP COLUMN \`website\`, DROP COLUMN \`whatsapp\`, DROP COLUMN \`facebook\`, DROP COLUMN \`instagram\`, DROP COLUMN \`longitude\`, DROP COLUMN \`latitude\``,
    );
  }
}
