import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import typeormConfig from './typeorm.config';
import { Chip } from '../modules/chips/entities/chip.entity';
import { GameType } from '../modules/game-types/entities/game-type.entity';
import { PokerTable, TableStatus } from '../modules/tables/entities/table.entity';
import { Tournament, TournamentStatus } from '../modules/tournaments/entities/tournament.entity';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { buildBlindStructure } from '../modules/tournaments/blind-structure.builder';

/**
 * Seed idempotente: crea un admin, tipos de juego, fichas de ejemplo,
 * una mesa cash y un torneo de ejemplo con estructura de ciegas generada.
 */
async function run(): Promise<void> {
  const dataSource: DataSource = await typeormConfig.initialize();
  console.log('Seed: connected to database');

  // Admin user
  const existingAdmin = await dataSource.getRepository(User).findOne({ where: { email: 'admin@pokelap.com' } });
  if (!existingAdmin) {
    const admin = dataSource.getRepository(User).create({
      email: 'admin@pokelap.com',
      name: 'PokeLAP Admin',
      password: await bcrypt.hash('Admin123!', 10),
      role: UserRole.ADMIN,
    });
    await dataSource.getRepository(User).save(admin);
    console.log('Seed: admin user created (admin@pokelap.com / Admin123!)');
  }

  // Game types
  const gameTypeRepo = dataSource.getRepository(GameType);
  const gameTypesData = [
    { name: "Texas Hold'em", description: 'Classic community-card game with two hole cards.', holeCards: 2, communityCards: 5 },
    { name: 'Pot-Limit Omaha (PLO4)', description: 'Omaha with four hole cards, use exactly two.', holeCards: 4, communityCards: 5 },
    { name: 'PLO5', description: 'Pot-Limit Omaha with five hole cards.', holeCards: 5, communityCards: 5 },
    { name: 'Short Deck', description: 'Six-plus hold-em played with a 36-card deck.', holeCards: 2, communityCards: 5 },
    { name: '2-7 Triple Draw', description: 'Lowball draw game; lowest five-card hand wins.', holeCards: 5, communityCards: 0 },
  ];
  const gameTypes: GameType[] = [];
  for (const gt of gameTypesData) {
    let existing = await gameTypeRepo.findOne({ where: { name: gt.name } });
    if (!existing) {
      existing = await gameTypeRepo.save(gameTypeRepo.create(gt));
      console.log(`Seed: game type "${gt.name}" created`);
    }
    gameTypes.push(existing);
  }

  // Chips
  const chipRepo = dataSource.getRepository(Chip);
  const chipsData = [
    { value: 5, color: 'White', hexColor: '#F5F5F5' },
    { value: 10, color: 'Blue', hexColor: '#2F6FED' },
    { value: 25, color: 'Green', hexColor: '#2E9E5B' },
    { value: 50, color: 'Red', hexColor: '#E5484D' },
    { value: 100, color: 'Black', hexColor: '#1B1F24' },
    { value: 500, color: 'Purple', hexColor: '#8E4EC6' },
    { value: 1000, color: 'Orange', hexColor: '#F76B15' },
    { value: 5000, color: 'Yellow', hexColor: '#F7B32B' },
    { value: 25000, color: 'Grey', hexColor: '#6B7280' },
  ];
  for (const chip of chipsData) {
    const existing = await chipRepo.findOne({ where: { value: chip.value } });
    if (!existing) {
      await chipRepo.save(chipRepo.create(chip));
      console.log(`Seed: chip ${chip.color} (${chip.value}) created`);
    }
  }

  // Sample cash table
  const tableRepo = dataSource.getRepository(PokerTable);
  const existingTable = await tableRepo.findOne({ where: { name: 'Cash Game A' } });
  if (!existingTable) {
    await tableRepo.save(
      tableRepo.create({
        name: 'Cash Game A',
        gameTypeId: gameTypes[0].id,
        smallBlind: 1,
        bigBlind: 2,
        minBuyIn: 50,
        maxBuyIn: 300,
        seats: 9,
        status: TableStatus.OPEN,
        notes: '1/2 No-Limit Hold\'em cash table.',
      }),
    );
    console.log('Seed: sample cash table created');
  }

  // Sample tournament with auto-generated blind structure
  const tournamentRepo = dataSource.getRepository(Tournament);
  const existingTournament = await tournamentRepo.findOne({ where: { name: 'Sunday Special' } });
  if (!existingTournament) {
    const blindConfig = {
      startingStack: 10000,
      levelDurationMin: 20,
      growth: 'normal' as const,
      anteMode: 'bb_ante' as const,
      breakEveryLevels: 4,
      maxPlayers: 9,
      breakDurationMin: 10,
    };
    const structure = buildBlindStructure(blindConfig);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    startDate.setHours(19, 0, 0, 0);

    await tournamentRepo.save(
      tournamentRepo.create({
        name: 'Sunday Special',
        gameTypeId: gameTypes[0].id,
        startDate,
        status: TournamentStatus.REGISTERING,
        buyIn: 50,
        fee: 5,
        startingStack: 10000,
        maxPlayers: 9,
        registrationOpen: true,
        reEntryEnabled: true,
        maxReEntries: 1,
        lateRegistrationEnabled: true,
        lateRegistrationUntilLevel: 6,
        addOnEnabled: true,
        addOnAmount: 40,
        addOnStack: 15000,
        addOnUntilLevel: 6,
        blindConfig,
        blindStructure: structure.items,
      }),
    );
    console.log('Seed: sample tournament created');
  }

  await dataSource.destroy();
  console.log('Seed: finished');
}

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});