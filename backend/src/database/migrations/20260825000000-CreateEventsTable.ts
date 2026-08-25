import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea la tabla `events` para registrar eventos del sistema. Inicialmente se usa
 * para las solicitudes de borrado de cuenta/datos (`type='request-delete'`).
 *
 * El FK a `users` usa ON DELETE SET NULL para conservar el registro de auditoría
 * aunque la cuenta se elimine después.
 */
export class CreateEventsTable20260825000000 implements MigrationInterface {
  name = 'CreateEventsTable20260825000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`events\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`type\` varchar(100) NOT NULL DEFAULT 'request-delete',
        \`json\` text NOT NULL,
        \`user_id\` int NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_events_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`events\``);
  }
}
