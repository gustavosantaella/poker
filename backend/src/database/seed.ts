import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import typeormConfig from './typeorm.config';
import { Chip } from '../modules/chips/entities/chip.entity';
import { GameType } from '../modules/game-types/entities/game-type.entity';
import { PokerTable, TableStatus } from '../modules/tables/entities/table.entity';
import { Tournament, TournamentStatus } from '../modules/tournaments/entities/tournament.entity';
import { TournamentChip } from '../modules/tournaments/entities/tournament-chip.entity';
import { TournamentPrize } from '../modules/tournaments/entities/tournament-prize.entity';
import {
  ReservationStatus,
  TournamentReservation,
} from '../modules/tournaments/entities/tournament-reservation.entity';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { buildBlindStructure } from '../modules/tournaments/blind-structure.builder';
import { BlindConfig, BuildBlindStructureParams } from '../modules/tournaments/types/blind-structure';

interface LiveState {
  startedAt: Date;
  currentLevel?: number;
  levelStartedAt?: Date;
}

interface SeedTournament {
  name: string;
  status: TournamentStatus;
  startDate: Date;
  buyIn: number;
  fee: number;
  startingStack: number;
  maxPlayers: number;
  blindConfig: BuildBlindStructureParams;
  live?: LiveState;
  options?: Partial<
    Pick<
      Tournament,
      | 'registrationOpen'
      | 'currentPlayers'
      | 'reservedPlayers'
      | 'reEntryEnabled'
      | 'maxReEntries'
      | 'lateRegistrationEnabled'
      | 'lateRegistrationUntilLevel'
      | 'addOnEnabled'
      | 'addOnAmount'
      | 'addOnStack'
      | 'addOnUntilLevel'
      | 'guaranteedPrize'
      | 'paidPlacesType'
      | 'paidPlacesValue'
    >
  >;
  reservations?: { count: number; accepted: number; rejected: number };
  chips?: { value: number; discardLevel: number | null }[];
  prizeTotal?: number;
  prizePlaces?: number;
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

function daysFromNow(days: number, hour = 19): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

/** Distribucion por defecto de premios (descendente, el ultimo ajusta el total). */
function buildDefaultPrizes(total: number, places: number): { place: number; amount: number }[] {
  if (total <= 0 || places <= 0) return [];
  if (places === 1) return [{ place: 1, amount: total }];
  const weights = Array.from({ length: places }, (_, i) => places - i);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const rows: { place: number; amount: number }[] = [];
  let assigned = 0;
  weights.forEach((w, i) => {
    const amount = i === places - 1 ? total - assigned : Math.round((total * w) / weightSum);
    rows.push({ place: i + 1, amount });
    assigned += amount;
  });
  return rows;
}

/**
 * Seed idempotente: crea admin, jugadores (rol player), tipos de juego, fichas,
 * una mesa cash y torneos de prueba en distintos estados con reservas, fichas
 * del torneo y premios.
 */
async function run(): Promise<void> {
  const dataSource: DataSource = await typeormConfig.initialize();
  console.log('Seed: connected to database');

  // ---- Admin user ----
  const userRepo = dataSource.getRepository(User);
  const existingAdmin = await userRepo.findOne({ where: { email: 'admin@pokelap.com' } });
  if (!existingAdmin) {
    await userRepo.save(
      userRepo.create({
        email: 'admin@pokelap.com',
        name: 'PokeLAP Admin',
        password: await bcrypt.hash('Admin123!', 10),
        role: UserRole.ADMIN,
      }),
    );
    console.log('Seed: admin user created (admin@pokelap.com / Admin123!)');
  }

  // ---- Jugadores (usuarios con rol player) ----
  const playerNames = [
    'Carlos Méndez',
    'Lucía Fernández',
    'Diego Álvarez',
    'Sofía Rojas',
    'Mateo Torres',
    'Valentina Cruz',
    'Andrés Silva',
    'Camila Ortega',
    'Jorge Paredes',
    'Isabella Medina',
  ];
  for (let i = 0; i < playerNames.length; i++) {
    const email = `player${i + 1}@pokelap.com`;
    const existing = await userRepo.findOne({ where: { email } });
    if (!existing) {
      await userRepo.save(
        userRepo.create({
          email,
          name: playerNames[i],
          password: await bcrypt.hash('Player123!', 10),
          role: UserRole.PLAYER,
        }),
      );
      console.log(`Seed: player "${playerNames[i]}" created (${email} / Player123!)`);
    }
  }
  const players = await userRepo.find({ where: { role: UserRole.PLAYER }, order: { email: 'ASC' } });
  console.log(`Seed: ${players.length} players available`);
  // ---- Game types ----
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

  // ---- Chips ----
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

  // ---- Mesa cash de ejemplo ----
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
        notes: "1/2 No-Limit Hold'em cash table.",
      }),
    );
    console.log('Seed: sample cash table created');
  }

  // ---- Torneos de prueba con reservas, fichas y premios ----
  const tournamentRepo = dataSource.getRepository(Tournament);
  const reservationRepo = dataSource.getRepository(TournamentReservation);
  const tournamentChipRepo = dataSource.getRepository(TournamentChip);
  const prizeRepo = dataSource.getRepository(TournamentPrize);

  const tournamentsData: SeedTournament[] = [
    {
      name: 'Freeroll Friday',
      status: TournamentStatus.SCHEDULED,
      startDate: daysFromNow(2, 20),
      buyIn: 0,
      fee: 0,
      startingStack: 5000,
      maxPlayers: 45,
      blindConfig: {
        startingStack: 5000,
        levelDurationMin: 12,
        growth: 'fast',
        anteMode: 'per_player',
        breakEveryLevels: 4,
        breakDurationMin: 5,
        maxPlayers: 45,
      },
      options: { registrationOpen: false, currentPlayers: 0, reservedPlayers: 0 },
    },
    {
      name: 'Sunday Special',
      status: TournamentStatus.REGISTERING,
      startDate: daysFromNow(7, 19),
      buyIn: 50,
      fee: 5,
      startingStack: 10000,
      maxPlayers: 9,
      blindConfig: {
        startingStack: 10000,
        levelDurationMin: 20,
        growth: 'normal',
        anteMode: 'bb_ante',
        breakEveryLevels: 4,
        breakDurationMin: 10,
        maxPlayers: 9,
      },
      options: {
        registrationOpen: true,
        currentPlayers: 6,
        reservedPlayers: 7,
        reEntryEnabled: true,
        maxReEntries: 1,
        lateRegistrationEnabled: true,
        lateRegistrationUntilLevel: 6,
        addOnEnabled: true,
        addOnAmount: 40,
        addOnStack: 15000,
        addOnUntilLevel: 6,
        guaranteedPrize: 1000,
        paidPlacesType: 'fixed',
        paidPlacesValue: 3,
      },
      reservations: { count: 7, accepted: 5, rejected: 1 },
      chips: [
        { value: 5, discardLevel: null },
        { value: 25, discardLevel: null },
        { value: 100, discardLevel: null },
        { value: 500, discardLevel: 4 },
        { value: 1000, discardLevel: 8 },
        { value: 5000, discardLevel: 12 },
      ],
      prizeTotal: 1000,
      prizePlaces: 3,
    },
    {
      name: 'Midweek Rush',
      status: TournamentStatus.RUNNING,
      startDate: minutesAgo(40),
      buyIn: 20,
      fee: 3,
      startingStack: 15000,
      maxPlayers: 18,
      blindConfig: {
        startingStack: 15000,
        levelDurationMin: 10,
        growth: 'normal',
        anteMode: 'bb_ante',
        breakEveryLevels: 3,
        breakDurationMin: 5,
        maxPlayers: 18,
      },
      live: { startedAt: minutesAgo(40), currentLevel: 5, levelStartedAt: minutesAgo(3) },
      options: {
        registrationOpen: false,
        currentPlayers: 12,
        reservedPlayers: 10,
        reEntryEnabled: true,
        maxReEntries: 2,
        lateRegistrationEnabled: true,
        lateRegistrationUntilLevel: 4,
        guaranteedPrize: 2000,
        paidPlacesType: 'percent',
        paidPlacesValue: 50,
      },
      reservations: { count: 10, accepted: 8, rejected: 1 },
      chips: [
        { value: 5, discardLevel: null },
        { value: 25, discardLevel: null },
        { value: 100, discardLevel: null },
        { value: 500, discardLevel: null },
        { value: 1000, discardLevel: 6 },
        { value: 5000, discardLevel: 11 },
        { value: 25000, discardLevel: 16 },
      ],
      prizeTotal: 2000,
      prizePlaces: 9,
    },
    {
      name: 'Deep Stack Daily',
      status: TournamentStatus.PAUSED,
      startDate: minutesAgo(90),
      buyIn: 100,
      fee: 10,
      startingStack: 40000,
      maxPlayers: 9,
      blindConfig: {
        startingStack: 40000,
        levelDurationMin: 15,
        growth: 'slow',
        anteMode: 'bb_ante',
        breakEveryLevels: 4,
        breakDurationMin: 10,
        maxPlayers: 9,
      },
      live: { startedAt: minutesAgo(90), currentLevel: 8, levelStartedAt: minutesAgo(90) },
      options: {
        registrationOpen: false,
        currentPlayers: 8,
        reservedPlayers: 9,
        reEntryEnabled: true,
        maxReEntries: 1,
        guaranteedPrize: 1500,
        paidPlacesType: 'fixed',
        paidPlacesValue: 5,
      },
      reservations: { count: 9, accepted: 8, rejected: 1 },
      chips: [
        { value: 25, discardLevel: null },
        { value: 100, discardLevel: null },
        { value: 500, discardLevel: null },
        { value: 1000, discardLevel: 5 },
        { value: 5000, discardLevel: 9 },
        { value: 25000, discardLevel: 14 },
      ],
      prizeTotal: 1500,
      prizePlaces: 5,
    },
    {
      name: 'Endurance Event',
      status: TournamentStatus.COMPLETED,
      startDate: daysFromNow(-1, 19),
      buyIn: 75,
      fee: 7,
      startingStack: 20000,
      maxPlayers: 27,
      blindConfig: {
        startingStack: 20000,
        levelDurationMin: 15,
        growth: 'normal',
        anteMode: 'bb_ante',
        breakEveryLevels: 4,
        breakDurationMin: 10,
        maxPlayers: 27,
      },
      live: { startedAt: daysFromNow(-1, 19) },
      options: {
        registrationOpen: false,
        currentPlayers: 10,
        reservedPlayers: 10,
        guaranteedPrize: 5000,
        paidPlacesType: 'percent',
        paidPlacesValue: 40,
      },
      reservations: { count: 10, accepted: 10, rejected: 0 },
      chips: [
        { value: 5, discardLevel: null },
        { value: 25, discardLevel: null },
        { value: 100, discardLevel: null },
        { value: 500, discardLevel: null },
        { value: 1000, discardLevel: 5 },
        { value: 5000, discardLevel: 9 },
        { value: 25000, discardLevel: 14 },
      ],
      prizeTotal: 5000,
      prizePlaces: 11,
    },
  ];
  for (const spec of tournamentsData) {
    let tournament = await tournamentRepo.findOne({ where: { name: spec.name } });
    if (!tournament) {
      const structure = buildBlindStructure(spec.blindConfig);
      tournament = await tournamentRepo.save(
        tournamentRepo.create({
          name: spec.name,
          gameTypeId: gameTypes[0].id,
          startDate: spec.startDate,
          status: spec.status,
          buyIn: spec.buyIn,
          fee: spec.fee,
          startingStack: spec.startingStack,
          maxPlayers: spec.maxPlayers,
          currentPlayers: spec.options?.currentPlayers ?? 0,
          reservedPlayers: spec.options?.reservedPlayers ?? 0,
          registrationOpen: spec.options?.registrationOpen ?? spec.status === TournamentStatus.REGISTERING,
          reEntryEnabled: spec.options?.reEntryEnabled ?? false,
          maxReEntries: spec.options?.maxReEntries ?? null,
          lateRegistrationEnabled: spec.options?.lateRegistrationEnabled ?? false,
          lateRegistrationUntilLevel: spec.options?.lateRegistrationUntilLevel ?? null,
          addOnEnabled: spec.options?.addOnEnabled ?? false,
          addOnAmount: spec.options?.addOnAmount ?? null,
          addOnStack: spec.options?.addOnStack ?? null,
          addOnUntilLevel: spec.options?.addOnUntilLevel ?? null,
          guaranteedPrize: spec.options?.guaranteedPrize ?? null,
          paidPlacesType: spec.options?.paidPlacesType ?? null,
          paidPlacesValue: spec.options?.paidPlacesValue ?? null,
          blindConfig: spec.blindConfig as BlindConfig,
          blindStructure: structure.items,
          startedAt: spec.live?.startedAt ?? null,
          currentLevel: spec.live?.currentLevel ?? null,
          levelStartedAt: spec.live?.levelStartedAt ?? null,
        }),
      );
      console.log(`Seed: tournament "${spec.name}" created (${spec.status})`);
    }

    // Reservas del torneo
    const reservationCount = await reservationRepo.count({ where: { tournamentId: tournament.id } });
    if (reservationCount === 0 && spec.reservations) {
      const { count, accepted, rejected } = spec.reservations;
      const toCreate = Math.min(count, players.length);
      let seedReEntries = 0;
      for (let i = 0; i < toCreate; i++) {
        const status =
          i < accepted
            ? ReservationStatus.ACCEPTED
            : i < accepted + rejected
              ? ReservationStatus.REJECTED
              : ReservationStatus.PENDING;
        const reEntries =
          status === ReservationStatus.ACCEPTED && tournament.reEntryEnabled && i % 4 === 0 ? 1 : 0;
        seedReEntries += reEntries;
        await reservationRepo.save(
          reservationRepo.create({
            tournamentId: tournament.id,
            userId: players[i].id,
            status,
            stack: status === ReservationStatus.ACCEPTED ? tournament.startingStack : null,
            reEntries,
          }),
        );
      }
      if (seedReEntries > 0) {
        await tournamentRepo.update(tournament.id, { currentReEntries: seedReEntries });
      }
      console.log(`Seed: ${toCreate} reservations for "${spec.name}"`);
    }

    // Fichas del torneo
    const tournamentChipCount = await tournamentChipRepo.count({ where: { tournamentId: tournament.id } });
    if (tournamentChipCount === 0 && spec.chips) {
      for (const chipSpec of spec.chips) {
        const chip = await chipRepo.findOne({ where: { value: chipSpec.value } });
        if (chip) {
          await tournamentChipRepo.save(
            tournamentChipRepo.create({
              tournamentId: tournament.id,
              chipId: chip.id,
              discardLevel: chipSpec.discardLevel,
            }),
          );
        }
      }
      console.log(`Seed: ${spec.chips.length} tournament chips for "${spec.name}"`);
    }

    // Premios del torneo
    const prizeCount = await prizeRepo.count({ where: { tournamentId: tournament.id } });
    if (prizeCount === 0 && spec.prizeTotal && spec.prizePlaces) {
      const rows = buildDefaultPrizes(spec.prizeTotal, spec.prizePlaces).map((prize) =>
        prizeRepo.create({ tournamentId: tournament.id, place: prize.place, amount: prize.amount }),
      );
      await prizeRepo.save(rows);
      console.log(`Seed: ${rows.length} prizes for "${spec.name}"`);
    }
  }

  await dataSource.destroy();
  console.log('Seed: finished');
}

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});