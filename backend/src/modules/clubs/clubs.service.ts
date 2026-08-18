import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CrudService } from '../../common/services/crud.service';
import { PokerTable } from '../tables/entities/table.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { UpdateClubMemberDto } from './dto/update-club-member.dto';
import { Club } from './entities/club.entity';
import { ClubMember, ClubMemberStatus } from './entities/club-member.entity';

@Injectable()
export class ClubsService extends CrudService<Club> {
  constructor(
    @InjectRepository(Club) repository: Repository<Club>,
    @InjectRepository(ClubMember) private readonly membersRepo: Repository<ClubMember>,
    @InjectRepository(PokerTable) private readonly tablesRepo: Repository<PokerTable>,
    @InjectRepository(Tournament) private readonly tournamentsRepo: Repository<Tournament>,
  ) {
    super(repository);
  }

  /** Genera un código numérico de 6 dígitos único (100000-999999). */
  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const exists = await this.repository.findOne({ where: { code } });
      if (!exists) return code;
    }
    throw new Error('Could not generate a unique club code');
  }

  async createClub(dto: CreateClubDto, currentUserId: number): Promise<Club> {
    const code = await this.generateUniqueCode();
    return super.create({
      code,
      name: dto.name,
      photoUrl: dto.photoUrl ?? null,
      address: dto.address ?? null,
      phone: dto.phone ?? null,
      adminUserId: dto.adminUserId ?? currentUserId,
      createdByUserId: currentUserId,
    });
  }

  async update(id: number, dto: UpdateClubDto): Promise<Club> {
    return super.update(id, dto as Partial<Club>);
  }

  /** Enriquece clubs con el conteo de mesas, torneos y miembros aceptados. */
  private async enrichCounts(clubs: Club[]): Promise<Club[]> {
    if (clubs.length === 0) return clubs;
    const ids = clubs.map((c) => c.id);
    const [tableRows, tournamentRows, memberRows] = await Promise.all([
      this.tablesRepo
        .createQueryBuilder('t')
        .select('t.club_id', 'clubId')
        .addSelect('COUNT(*)', 'count')
        .where('t.club_id IN (:...ids)', { ids })
        .groupBy('t.club_id')
        .getRawMany(),
      this.tournamentsRepo
        .createQueryBuilder('t')
        .select('t.club_id', 'clubId')
        .addSelect('COUNT(*)', 'count')
        .where('t.club_id IN (:...ids)', { ids })
        .groupBy('t.club_id')
        .getRawMany(),
      this.membersRepo
        .createQueryBuilder('m')
        .select('m.club_id', 'clubId')
        .addSelect("SUM(CASE WHEN m.status = 'accepted' THEN 1 ELSE 0 END)", 'count')
        .where('m.club_id IN (:...ids)', { ids })
        .groupBy('m.club_id')
        .getRawMany(),
    ]);

    const tablesMap = new Map<number, number>();
    for (const row of tableRows) tablesMap.set(Number(row.clubId), Number(row.count ?? 0));
    const tournamentsMap = new Map<number, number>();
    for (const row of tournamentRows) tournamentsMap.set(Number(row.clubId), Number(row.count ?? 0));
    const membersMap = new Map<number, number>();
    for (const row of memberRows) membersMap.set(Number(row.clubId), Number(row.count ?? 0));

    return clubs.map((club) => ({
      ...club,
      tablesCount: tablesMap.get(club.id) ?? 0,
      tournamentsCount: tournamentsMap.get(club.id) ?? 0,
      membersCount: membersMap.get(club.id) ?? 0,
    }));
  }

  /** Listado de clubs enriqueciendo cada item con mesas, torneos y miembros. */
  async findAllWithCounts(options: Parameters<CrudService<Club>['findAll']>[0] = {}) {
    const result = await this.findAll(options);
    return { ...result, items: await this.enrichCounts(result.items) };
  }

  // ---------------- Membresías ----------------

  /** Solicitud de unión a un club por código: crea (o reactiva) una membresía pendiente. */
  async joinClub(code: string, userId: number) {
    const club = await this.repository.findOne({ where: { code } });
    if (!club) {
      throw new NotFoundException('Club not found with that code');
    }
    const existing = await this.membersRepo.findOne({ where: { clubId: club.id, userId } });
    if (existing) {
      if (existing.status === ClubMemberStatus.ACCEPTED) {
        throw new BadRequestException('You are already a member of this club');
      }
      if (existing.status === ClubMemberStatus.PENDING) {
        throw new BadRequestException('You already have a pending request to join this club');
      }
      // Fue rechazado: permite volver a solicitarlo.
      existing.status = ClubMemberStatus.PENDING;
      const saved = await this.membersRepo.save(existing);
      return { club, membership: saved };
    }
    const membership = await this.membersRepo.save(
      this.membersRepo.create({
        clubId: club.id,
        userId,
        status: ClubMemberStatus.PENDING,
      }),
    );
    return { club, membership };
  }

  /** Clubs donde el usuario es miembro aceptado. */
  async myClubs(userId: number): Promise<Club[]> {
    const memberships = await this.membersRepo.find({
      where: { userId, status: ClubMemberStatus.ACCEPTED },
    });
    const clubIds = memberships.map((m) => m.clubId);
    if (clubIds.length === 0) return [];
    const clubs = await this.repository.find({
      where: { id: In(clubIds) },
      order: { createdAt: 'DESC' },
    });
    return this.enrichCounts(clubs);
  }

  /** Todas las membresías del usuario (para conocer su estado por club). */
  async myMemberships(userId: number) {
    return this.membersRepo.find({
      where: { userId },
      select: ['id', 'clubId', 'status'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Lista de miembros (y solicitudes) de un club. */
  async listMembers(clubId: number): Promise<ClubMember[]> {
    await this.findOne(clubId);
    return this.membersRepo.find({ where: { clubId }, order: { createdAt: 'DESC' } });
  }

  /** Acepta o rechaza la solicitud de un miembro (solo el admin del club). */
  async updateMember(
    clubId: number,
    memberId: number,
    dto: UpdateClubMemberDto,
    adminUserId: number,
  ): Promise<ClubMember> {
    const club = await this.findOne(clubId);
    if (club.adminUserId !== adminUserId) {
      throw new ForbiddenException('Only the club admin can manage members');
    }
    const member = await this.membersRepo.findOne({ where: { id: memberId, clubId } });
    if (!member) {
      throw new NotFoundException('Membership not found');
    }
    member.status = dto.status as ClubMemberStatus;
    const saved = await this.membersRepo.save(member);
    return saved;
  }

  /** Elimina un miembro del club (solo el admin del club). */
  async removeMember(clubId: number, memberId: number, adminUserId: number): Promise<void> {
    const club = await this.findOne(clubId);
    if (club.adminUserId !== adminUserId) {
      throw new ForbiddenException('Only the club admin can manage members');
    }
    const member = await this.membersRepo.findOne({ where: { id: memberId, clubId } });
    if (!member) {
      throw new NotFoundException('Membership not found');
    }
    await this.membersRepo.delete(member.id);
  }
}
