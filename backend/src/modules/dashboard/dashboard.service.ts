import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Chip } from '../chips/entities/chip.entity';
import { GameType } from '../game-types/entities/game-type.entity';
import { PokerTable, TableStatus } from '../tables/entities/table.entity';
import { Tournament, TournamentStatus } from '../tournaments/entities/tournament.entity';
import { User } from '../users/entities/user.entity';

export interface DashboardStats {
  tables: number;
  openTables: number;
  tournaments: number;
  activeTournaments: number;
  chips: number;
  gameTypes: number;
  users: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(PokerTable) private readonly tablesRepo: Repository<PokerTable>,
    @InjectRepository(Tournament) private readonly tournamentsRepo: Repository<Tournament>,
    @InjectRepository(Chip) private readonly chipsRepo: Repository<Chip>,
    @InjectRepository(GameType) private readonly gameTypesRepo: Repository<GameType>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  async stats(): Promise<DashboardStats> {
    const [
      tables,
      openTables,
      tournaments,
      activeTournaments,
      chips,
      gameTypes,
      users,
    ] = await Promise.all([
      this.tablesRepo.count({ where: { isActive: true } }),
      this.tablesRepo.count({ where: { isActive: true, status: In([TableStatus.OPEN, TableStatus.RUNNING]) } }),
      this.tournamentsRepo.count({ where: { isActive: true } }),
      this.tournamentsRepo.count({
        where: { isActive: true, status: In([TournamentStatus.REGISTERING, TournamentStatus.RUNNING]) },
      }),
      this.chipsRepo.count({ where: { isActive: true } }),
      this.gameTypesRepo.count({ where: { isActive: true } }),
      this.usersRepo.count(),
    ]);
    return { tables, openTables, tournaments, activeTournaments, chips, gameTypes, users };
  }
}
