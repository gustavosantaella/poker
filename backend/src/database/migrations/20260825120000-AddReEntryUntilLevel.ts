import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade `reEntryUntilLevel` a `tournaments`: nivel de ciegas hasta el cual se
 * permite la re-compra (rebuy). Null = re-compra permitida hasta el cierre de
 * inscripción.
 */
export class AddReEntryUntilLevel20260825120000 implements MigrationInterface {
  name = 'AddReEntryUntilLevel20260825120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`tournaments\` ADD \`reEntryUntilLevel\` int NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`tournaments\` DROP COLUMN \`reEntryUntilLevel\``);
  }
}
