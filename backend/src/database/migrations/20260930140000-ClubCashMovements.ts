import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Caja y recaudación del club: libro mayor de movimientos de dinero.
 *
 * - `club_cash_movements`: entradas y salidas de caja (entradas, re-entradas,
 *   add-ons, premios, gastos, retiradas, ingresos y ajustes), con estado de
 *   cobro (`pending`/`paid`/`void`), forma de pago, comisión incluida y quién
 *   cobró.
 * - `source_key` con índice único: los movimientos generados automáticamente
 *   desde las reservas (`entry:reservation:12`, `prize:tournament:5:place:1`)
 *   no se duplican al sincronizar.
 */
export class ClubCashMovements20260930140000 implements MigrationInterface {
  name = 'ClubCashMovements20260930140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`club_cash_movements\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`club_id\` int NOT NULL,
        \`tournament_id\` int NULL,
        \`user_id\` int NULL,
        \`reservation_id\` int NULL,
        \`type\` enum('entry','re_entry','add_on','prize','expense','withdrawal','deposit','adjustment') NOT NULL,
        \`direction\` enum('in','out') NOT NULL,
        \`status\` enum('pending','paid','void') NOT NULL DEFAULT 'pending',
        \`method\` enum('cash','card','transfer','other') NOT NULL DEFAULT 'cash',
        \`amount\` decimal(14,2) NOT NULL,
        \`fee_amount\` decimal(14,2) NULL,
        \`currency\` varchar(3) NOT NULL DEFAULT 'USD',
        \`place\` int NULL,
        \`note\` varchar(255) NULL,
        \`occurred_at\` datetime NOT NULL,
        \`paid_at\` datetime NULL,
        \`created_by_user_id\` int NULL,
        \`settled_by_user_id\` int NULL,
        \`source_key\` varchar(120) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_club_cash_movements_source\` (\`source_key\`),
        INDEX \`IDX_club_cash_movements_club_date\` (\`club_id\`, \`occurred_at\`),
        INDEX \`IDX_club_cash_movements_tournament\` (\`tournament_id\`),
        INDEX \`IDX_club_cash_movements_user\` (\`user_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );

    await queryRunner.query(
      `ALTER TABLE \`club_cash_movements\` ADD CONSTRAINT \`FK_club_cash_movements_club\` FOREIGN KEY (\`club_id\`) REFERENCES \`clubs\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`club_cash_movements\` ADD CONSTRAINT \`FK_club_cash_movements_tournament\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournaments\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`club_cash_movements\` ADD CONSTRAINT \`FK_club_cash_movements_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`club_cash_movements\` DROP FOREIGN KEY \`FK_club_cash_movements_user\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`club_cash_movements\` DROP FOREIGN KEY \`FK_club_cash_movements_tournament\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`club_cash_movements\` DROP FOREIGN KEY \`FK_club_cash_movements_club\``,
    );
    await queryRunner.query(`DROP TABLE \`club_cash_movements\``);
  }
}
