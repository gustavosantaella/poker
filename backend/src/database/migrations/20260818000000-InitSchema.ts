import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración inicial del esquema PokeLAP (MySQL 8).
 * Generada a partir de las entidades. En producción se ejecuta automáticamente
 * al arrancar (migrationsRun). Para cambios futuros: npm run migration:generate.
 */
export class InitSchema20260818000000 implements MigrationInterface {
  name = 'InitSchema20260818000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------- users ----------
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`email\` varchar(255) NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`password\` varchar(255) NOT NULL,
        \`role\` enum('admin','manager','dealer','player') NOT NULL DEFAULT 'admin',
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`address\` varchar(255) NULL,
        \`phone\` varchar(60) NULL,
        \`city\` varchar(120) NULL,
        \`alias\` varchar(60) NULL,
        \`country\` varchar(100) NULL,
        \`photoUrl\` text NULL,
        UNIQUE INDEX \`IDX_users_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ---------- game_types ----------
    await queryRunner.query(`
      CREATE TABLE \`game_types\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`name\` varchar(80) NOT NULL,
        \`description\` text NULL,
        \`holeCards\` int NOT NULL DEFAULT 2,
        \`communityCards\` int NOT NULL DEFAULT 5,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        UNIQUE INDEX \`IDX_game_types_name\` (\`name\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ---------- chips ----------
    await queryRunner.query(`
      CREATE TABLE \`chips\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`value\` int NOT NULL,
        \`color\` varchar(50) NOT NULL,
        \`hexColor\` varchar(9) NOT NULL,
        \`quantity\` int NULL,
        \`notes\` text NULL,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ---------- clubs ----------
    await queryRunner.query(`
      CREATE TABLE \`clubs\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`code\` varchar(6) NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`photoUrl\` varchar(500) NULL,
        \`address\` varchar(255) NULL,
        \`phone\` varchar(40) NULL,
        \`adminUserId\` int NOT NULL,
        \`createdByUserId\` int NOT NULL,
        UNIQUE INDEX \`IDX_clubs_code\` (\`code\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ---------- club_members ----------
    await queryRunner.query(`
      CREATE TABLE \`club_members\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`clubId\` int NOT NULL,
        \`userId\` int NOT NULL,
        \`status\` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_club_members_club\` FOREIGN KEY (\`clubId\`) REFERENCES \`clubs\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_club_members_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ---------- tables ----------
    await queryRunner.query(`
      CREATE TABLE \`tables\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`name\` varchar(100) NOT NULL,
        \`game_type_id\` int NULL,
        \`smallBlind\` decimal(12,2) NOT NULL,
        \`bigBlind\` decimal(12,2) NOT NULL,
        \`minBuyIn\` decimal(14,2) NOT NULL,
        \`maxBuyIn\` decimal(14,2) NOT NULL,
        \`seats\` int NOT NULL DEFAULT 9,
        \`status\` enum('open','running','paused','closed') NOT NULL DEFAULT 'open',
        \`mode\` enum('live','online') NOT NULL DEFAULT 'live',
        \`currency\` varchar(3) NOT NULL DEFAULT 'USD',
        \`notes\` text NULL,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`club_id\` int NULL,
        \`created_by_user_id\` int NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_tables_game_type\` FOREIGN KEY (\`game_type_id\`) REFERENCES \`game_types\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ---------- table_reservations ----------
    await queryRunner.query(`
      CREATE TABLE \`table_reservations\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`table_id\` int NOT NULL,
        \`user_id\` int NOT NULL,
        \`status\` enum('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_table_reservations_table\` FOREIGN KEY (\`table_id\`) REFERENCES \`tables\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_table_reservations_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);


    // ---------- tournaments ----------
    await queryRunner.query(`
      CREATE TABLE \`tournaments\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`name\` varchar(100) NOT NULL,
        \`game_type_id\` int NULL,
        \`startDate\` datetime(6) NOT NULL,
        \`status\` enum('scheduled','registering','running','paused','completed','cancelled') NOT NULL DEFAULT 'scheduled',
        \`mode\` enum('live','online') NOT NULL DEFAULT 'live',
        \`currency\` varchar(3) NOT NULL DEFAULT 'USD',
        \`buyIn\` decimal(14,2) NOT NULL,
        \`fee\` decimal(14,2) NOT NULL DEFAULT 0,
        \`startingStack\` int NOT NULL,
        \`maxPlayers\` int NULL,
        \`currentPlayers\` int NOT NULL DEFAULT 0,
        \`currentReEntries\` int NOT NULL DEFAULT 0,
        \`currentAddOns\` int NOT NULL DEFAULT 0,
        \`reservedPlayers\` int NOT NULL DEFAULT 0,
        \`registrationOpen\` tinyint NOT NULL DEFAULT 1,
        \`currentDayTournament\` int NOT NULL DEFAULT 0,
        \`reEntryEnabled\` tinyint NOT NULL DEFAULT 0,
        \`maxReEntries\` int NULL,
        \`lateRegistrationEnabled\` tinyint NOT NULL DEFAULT 0,
        \`lateRegistrationUntilLevel\` int NULL,
        \`addOnEnabled\` tinyint NOT NULL DEFAULT 0,
        \`addOnAmount\` decimal(14,2) NULL,
        \`addOnStack\` int NULL,
        \`addOnUntilLevel\` int NULL,
        \`blindStructure\` json NULL,
        \`blindConfig\` json NULL,
        \`guaranteedPrize\` decimal(14,2) NULL,
        \`paidPlacesType\` varchar(10) NULL,
        \`paidPlacesValue\` int NULL,
        \`adminFeeType\` varchar(10) NULL,
        \`adminFeeValue\` decimal(14,2) NULL,
        \`startedAt\` datetime(6) NULL,
        \`currentLevel\` int NULL,
        \`levelStartedAt\` datetime(6) NULL,
        \`tableCount\` int NOT NULL DEFAULT 1,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`club_id\` int NULL,
        \`created_by_user_id\` int NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_tournaments_game_type\` FOREIGN KEY (\`game_type_id\`) REFERENCES \`game_types\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ---------- tournament_reservations ----------
    await queryRunner.query(`
      CREATE TABLE \`tournament_reservations\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`tournament_id\` int NOT NULL,
        \`user_id\` int NOT NULL,
        \`status\` enum('pending','accepted','rejected','stood_up','eliminated') NOT NULL DEFAULT 'pending',
        \`stack\` int NULL,
        \`reEntries\` int NOT NULL DEFAULT 0,
        \`tableNumber\` int NULL,
        \`seatNumber\` int NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_tournament_reservations_tournament_user\` (\`tournament_id\`, \`user_id\`),
        UNIQUE INDEX \`UQ_tournament_reservations_seat\` (\`tournament_id\`, \`tableNumber\`, \`seatNumber\`),
        CONSTRAINT \`FK_tournament_reservations_tournament\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournaments\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_tournament_reservations_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ---------- tournament_chips ----------
    await queryRunner.query(`
      CREATE TABLE \`tournament_chips\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`tournament_id\` int NOT NULL,
        \`chip_id\` int NOT NULL,
        \`discardLevel\` int NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_tournament_chips_tournament\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournaments\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_tournament_chips_chip\` FOREIGN KEY (\`chip_id\`) REFERENCES \`chips\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ---------- tournament_prizes ----------
    await queryRunner.query(`
      CREATE TABLE \`tournament_prizes\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`tournament_id\` int NOT NULL,
        \`place\` int NOT NULL,
        \`amount\` decimal(14,2) NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_tournament_prizes_tournament\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournaments\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`tournament_prizes\``);
    await queryRunner.query(`DROP TABLE \`tournament_chips\``);
    await queryRunner.query(`DROP TABLE \`tournament_reservations\``);
    await queryRunner.query(`DROP TABLE \`tournaments\``);
    await queryRunner.query(`DROP TABLE \`table_reservations\``);
    await queryRunner.query(`DROP TABLE \`tables\``);
    await queryRunner.query(`DROP TABLE \`club_members\``);
    await queryRunner.query(`DROP TABLE \`clubs\``);
    await queryRunner.query(`DROP TABLE \`chips\``);
    await queryRunner.query(`DROP TABLE \`game_types\``);
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}