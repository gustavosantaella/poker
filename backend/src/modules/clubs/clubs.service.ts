import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { In, Not, Repository } from 'typeorm';
import { CrudService } from '../../common/services/crud.service';
import { PokerTable, TableStatus } from '../tables/entities/table.entity';
import { Tournament, TournamentStatus } from '../tournaments/entities/tournament.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateClubDto } from './dto/create-club.dto';
import { CreateClubInvitationDto } from './dto/create-club-invitation.dto';
import { UpdateClubCollaboratorDto } from './dto/update-club-collaborator.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { UpdateClubMemberDto } from './dto/update-club-member.dto';
import { Club } from './entities/club.entity';
import { ClubInvitation, ClubInvitationStatus } from './entities/club-invitation.entity';
import { ClubMember, ClubMemberRole, ClubMemberStatus } from './entities/club-member.entity';

/** Métricas que alimentan el dashboard del club. */
export interface ClubStats {
  clubId: number;
  /** Rol del solicitante en el club (la app lo usa para mostrar/ocultar secciones). */
  myRole: ClubMemberRole;
  /** Miembros jugadores aceptados. */
  members: number;
  /** Colaboradores aceptados (admin, operadores y cajeros). */
  collaborators: number;
  /** Solicitudes de ingreso pendientes de revisar. */
  pendingMembers: number;
  /** Invitaciones de colaborador pendientes de aceptar. */
  pendingInvitations: number;
  tournaments: number;
  /** Torneos en curso o en inscripción. */
  activeTournaments: number;
  /** Mesas cash del club. */
  tables: number;
  /** Mesas abiertas o en juego. */
  openTables: number;
}

@Injectable()
export class ClubsService extends CrudService<Club> implements OnModuleInit {
  private readonly logger = new Logger(ClubsService.name);

  constructor(
    @InjectRepository(Club) repository: Repository<Club>,
    @InjectRepository(ClubMember) private readonly membersRepo: Repository<ClubMember>,
    @InjectRepository(ClubInvitation) private readonly invitationsRepo: Repository<ClubInvitation>,
    @InjectRepository(PokerTable) private readonly tablesRepo: Repository<PokerTable>,
    @InjectRepository(Tournament) private readonly tournamentsRepo: Repository<Tournament>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {
    super(repository);
  }

  /**
   * Al arrancar, garantiza que el admin de cada club figure como colaborador con
   * permisos totales: los clubes creados antes de este cambio no tenían fila en
   * `club_members`. La migración hace el mismo backfill en producción.
   */
  async onModuleInit(): Promise<void> {
    try {
      const clubs = await this.repository.find();
      let touched = 0;
      for (const club of clubs) {
        if (!club.adminUserId) continue;
        const existing = await this.membersRepo.findOne({
          where: { clubId: club.id, userId: club.adminUserId },
        });
        if (existing) {
          // El dueño siempre debe tener permisos totales y estar aceptado.
          if (
            existing.role !== ClubMemberRole.ADMIN ||
            existing.status !== ClubMemberStatus.ACCEPTED
          ) {
            existing.role = ClubMemberRole.ADMIN;
            existing.status = ClubMemberStatus.ACCEPTED;
            await this.membersRepo.save(existing);
            touched += 1;
          }
          continue;
        }
        await this.membersRepo.save(
          this.membersRepo.create({
            clubId: club.id,
            userId: club.adminUserId,
            status: ClubMemberStatus.ACCEPTED,
            role: ClubMemberRole.ADMIN,
          }),
        );
        touched += 1;
      }
      if (touched > 0) {
        this.logger.log(`Club owners ensured as collaborators: ${touched}`);
      }
    } catch (error) {
      this.logger.warn(
        `Could not verify club owners: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
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
    const club = await super.create({
      code,
      name: dto.name,
      photoUrl: dto.photoUrl ?? null,
      address: dto.address ?? null,
      phone: dto.phone ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      instagram: dto.instagram ?? null,
      facebook: dto.facebook ?? null,
      whatsapp: dto.whatsapp ?? null,
      website: dto.website ?? null,
      adminUserId: dto.adminUserId ?? currentUserId,
      createdByUserId: currentUserId,
    });
    // El admin del club queda registrado como colaborador con permisos totales.
    await this.membersRepo.save(
      this.membersRepo.create({
        clubId: club.id,
        userId: club.adminUserId,
        status: ClubMemberStatus.ACCEPTED,
        role: ClubMemberRole.ADMIN,
      }),
    );
    return club;
  }

  /** Actualiza la configuración del club (admin del club o admin global). */
  async updateClub(id: number, dto: UpdateClubDto, requester: User): Promise<Club> {
    await this.assertClubAccess(id, requester, [ClubMemberRole.ADMIN]);
    return super.update(id, dto as Partial<Club>);
  }

  // ---------------- Permisos dentro del club ----------------

  /**
   * Comprueba que el solicitante pueda gestionar el club y devuelve el club.
   *
   * Tienen acceso: el admin global del sistema, el dueño del club
   * (`clubs.adminUserId`) y los colaboradores aceptados cuyo rol esté en `roles`.
   */
  private async assertClubAccess(
    clubId: number,
    requester: User,
    roles: ClubMemberRole[] = [ClubMemberRole.ADMIN],
  ): Promise<Club> {
    const club = await this.findOne(clubId);
    if (requester.role === UserRole.ADMIN || club.adminUserId === requester.id) {
      return club;
    }
    const membership = await this.membersRepo.findOne({
      where: { clubId, userId: requester.id, status: ClubMemberStatus.ACCEPTED },
    });
    if (membership && roles.includes(membership.role)) {
      return club;
    }
    throw new ForbiddenException('You do not have permission to manage this club');
  }

  /** ¿El solicitante pertenece al club (cualquier rol aceptado)? */
  private async assertClubMembership(clubId: number, requester: User): Promise<Club> {
    const club = await this.findOne(clubId);
    if (requester.role === UserRole.ADMIN || club.adminUserId === requester.id) {
      return club;
    }
    const membership = await this.membersRepo.findOne({
      where: { clubId, userId: requester.id, status: ClubMemberStatus.ACCEPTED },
    });
    if (!membership) {
      throw new ForbiddenException('You do not have access to this club');
    }
    return club;
  }

  /** Permisos del solicitante dentro del club (por defecto, miembro). */
  private async resolveClubRole(club: Club, requester: User): Promise<ClubMemberRole> {
    if (requester.role === UserRole.ADMIN || club.adminUserId === requester.id) {
      return ClubMemberRole.ADMIN;
    }
    const membership = await this.membersRepo.findOne({
      where: { clubId: club.id, userId: requester.id, status: ClubMemberStatus.ACCEPTED },
    });
    return membership?.role ?? ClubMemberRole.MEMBER;
  }

  /** Genera el código único que el admin comparte para invitar a un colaborador. */
  private generateInviteToken(): string {
    return randomBytes(16).toString('hex');
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

  /** Lista de miembros del club (solicitudes, jugadores y colaboradores). */
  async listMembers(clubId: number, requester: User): Promise<ClubMember[]> {
    await this.assertClubAccess(clubId, requester, [
      ClubMemberRole.ADMIN,
      ClubMemberRole.OPERATOR,
      ClubMemberRole.CASHIER,
    ]);
    return this.membersRepo.find({ where: { clubId }, order: { createdAt: 'DESC' } });
  }

  /** Colaboradores aceptados (equipo del club) con sus permisos. */
  async listCollaborators(clubId: number, requester: User): Promise<ClubMember[]> {
    await this.assertClubAccess(clubId, requester, [ClubMemberRole.ADMIN, ClubMemberRole.OPERATOR]);
    return this.membersRepo.find({
      where: { clubId, status: ClubMemberStatus.ACCEPTED, role: Not(ClubMemberRole.MEMBER) },
      order: { createdAt: 'ASC' },
    });
  }

  /** Cambia los permisos de un colaborador (solo el admin del club). */
  async updateCollaboratorRole(
    clubId: number,
    memberId: number,
    dto: UpdateClubCollaboratorDto,
    requester: User,
  ): Promise<ClubMember> {
    const club = await this.assertClubAccess(clubId, requester, [ClubMemberRole.ADMIN]);
    const member = await this.membersRepo.findOne({ where: { id: memberId, clubId } });
    if (!member) {
      throw new NotFoundException('Membership not found');
    }
    if (member.userId === club.adminUserId) {
      throw new BadRequestException('The club owner role cannot be changed');
    }
    member.role = dto.role;
    member.status = ClubMemberStatus.ACCEPTED;
    return this.membersRepo.save(member);
  }

  /** Acepta o rechaza la solicitud de un miembro (solo el admin del club). */
  async updateMember(
    clubId: number,
    memberId: number,
    dto: UpdateClubMemberDto,
    requester: User,
  ): Promise<ClubMember> {
    await this.assertClubAccess(clubId, requester, [ClubMemberRole.ADMIN]);
    const member = await this.membersRepo.findOne({ where: { id: memberId, clubId } });
    if (!member) {
      throw new NotFoundException('Membership not found');
    }
    member.status = dto.status as ClubMemberStatus;
    const saved = await this.membersRepo.save(member);
    return saved;
  }

  /** Elimina un miembro o colaborador del club (solo el admin del club). */
  async removeMember(clubId: number, memberId: number, requester: User): Promise<void> {
    const club = await this.assertClubAccess(clubId, requester, [ClubMemberRole.ADMIN]);
    const member = await this.membersRepo.findOne({ where: { id: memberId, clubId } });
    if (!member) {
      throw new NotFoundException('Membership not found');
    }
    if (member.userId === club.adminUserId) {
      throw new BadRequestException('The club owner cannot be removed from the club');
    }
    await this.membersRepo.delete(member.id);
  }

  // ---------------- Métricas del club (dashboard) ----------------

  /** Resumen del club para el dashboard: miembros, colaboradores, torneos y mesas. */
  async stats(clubId: number, requester: User): Promise<ClubStats> {
    const club = await this.assertClubMembership(clubId, requester);
    const [
      myRole,
      members,
      collaborators,
      pendingMembers,
      pendingInvitations,
      tournaments,
      activeTournaments,
      tables,
      openTables,
    ] = await Promise.all([
      this.resolveClubRole(club, requester),
      this.membersRepo.count({
        where: { clubId, status: ClubMemberStatus.ACCEPTED, role: ClubMemberRole.MEMBER },
      }),
      this.membersRepo.count({
        where: { clubId, status: ClubMemberStatus.ACCEPTED, role: Not(ClubMemberRole.MEMBER) },
      }),
      this.membersRepo.count({ where: { clubId, status: ClubMemberStatus.PENDING } }),
      this.invitationsRepo.count({ where: { clubId, status: ClubInvitationStatus.PENDING } }),
      this.tournamentsRepo.count({ where: { clubId, isActive: true } }),
      this.tournamentsRepo.count({
        where: {
          clubId,
          isActive: true,
          status: In([TournamentStatus.REGISTERING, TournamentStatus.RUNNING]),
        },
      }),
      this.tablesRepo.count({ where: { clubId, isActive: true } }),
      this.tablesRepo.count({
        where: { clubId, isActive: true, status: In([TableStatus.OPEN, TableStatus.RUNNING]) },
      }),
    ]);
    return {
      clubId,
      myRole,
      members,
      collaborators,
      pendingMembers,
      pendingInvitations,
      tournaments,
      activeTournaments,
      tables,
      openTables,
    };
  }

  // ---------------- Invitaciones de colaboradores ----------------

  /** Invitaciones del club (pendientes y aceptadas). */
  async listInvitations(clubId: number, requester: User): Promise<ClubInvitation[]> {
    await this.assertClubAccess(clubId, requester, [ClubMemberRole.ADMIN]);
    return this.invitationsRepo.find({ where: { clubId }, order: { createdAt: 'DESC' } });
  }

  /**
   * Invita a un colaborador por correo y le asigna sus permisos.
   *
   * - Si el correo todavía no tiene cuenta, se genera un código (`token`) que el
   *   admin comparte; cuando esa persona se registre o inicie sesión con ese
   *   correo, la invitación se acepta sola y entra al club con el rol asignado.
   * - Si el correo ya tiene cuenta, se añade al club como colaborador al instante.
   */
  async createInvitation(clubId: number, dto: CreateClubInvitationDto, requester: User) {
    const club = await this.assertClubAccess(clubId, requester, [ClubMemberRole.ADMIN]);
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepo.findOne({ where: { email } });

    if (user) {
      const existing = await this.membersRepo.findOne({ where: { clubId, userId: user.id } });
      if (existing && existing.status === ClubMemberStatus.ACCEPTED && existing.role === dto.role) {
        throw new BadRequestException('That user already has these permissions in the club');
      }
    }

    // Reutiliza la invitación pendiente del mismo correo para no duplicar códigos.
    const pending = await this.invitationsRepo.findOne({
      where: { clubId, email, status: ClubInvitationStatus.PENDING },
    });
    let invitation: ClubInvitation;
    if (pending) {
      pending.role = dto.role;
      pending.invitedByUserId = requester.id;
      invitation = await this.invitationsRepo.save(pending);
    } else {
      invitation = await this.invitationsRepo.save(
        this.invitationsRepo.create({
          clubId,
          email,
          role: dto.role,
          token: this.generateInviteToken(),
          status: ClubInvitationStatus.PENDING,
          invitedByUserId: requester.id,
        }),
      );
    }

    // Si la cuenta ya existe, entra al club directamente con los permisos asignados.
    if (user) {
      await this.upsertMembership(clubId, user.id, dto.role, true);
      invitation.status = ClubInvitationStatus.ACCEPTED;
      invitation.acceptedByUserId = user.id;
      invitation.acceptedAt = new Date();
      invitation = await this.invitationsRepo.save(invitation);
      return { club, invitation, accepted: true };
    }

    return { club, invitation, accepted: false };
  }

  /** Revoca una invitación que todavía no se ha aceptado. */
  async revokeInvitation(clubId: number, invitationId: number, requester: User): Promise<void> {
    await this.assertClubAccess(clubId, requester, [ClubMemberRole.ADMIN]);
    const invitation = await this.invitationsRepo.findOne({ where: { id: invitationId, clubId } });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== ClubInvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be revoked');
    }
    invitation.status = ClubInvitationStatus.REVOKED;
    await this.invitationsRepo.save(invitation);
  }

  /** Invitaciones pendientes dirigidas al correo de un usuario. */
  async myInvitations(user: User): Promise<ClubInvitation[]> {
    return this.invitationsRepo.find({
      where: { email: (user.email ?? '').toLowerCase(), status: ClubInvitationStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  /** Acepta una invitación usando el código compartido por el admin del club. */
  async acceptInvitation(token: string, user: User) {
    const invitation = await this.invitationsRepo.findOne({ where: { token } });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== ClubInvitationStatus.PENDING) {
      throw new BadRequestException('This invitation is no longer valid');
    }
    if (invitation.email !== (user.email ?? '').toLowerCase()) {
      throw new ForbiddenException('This invitation was issued for another email address');
    }
    const membership = await this.upsertMembership(invitation.clubId, user.id, invitation.role, true);
    invitation.status = ClubInvitationStatus.ACCEPTED;
    invitation.acceptedByUserId = user.id;
    invitation.acceptedAt = new Date();
    await this.invitationsRepo.save(invitation);
    return { clubId: invitation.clubId, invitation, membership };
  }

  /**
   * Acepta automáticamente las invitaciones pendientes del correo del usuario.
   * Se llama al iniciar sesión y al registrarse, para que un colaborador invitado
   * entre al club sin pasos extra. Devuelve cuántas invitaciones se aceptaron.
   */
  async syncInvitationsForUser(user: User): Promise<number> {
    const email = (user.email ?? '').toLowerCase();
    if (!email) return 0;
    const invitations = await this.invitationsRepo.find({
      where: { email, status: ClubInvitationStatus.PENDING },
    });
    for (const invitation of invitations) {
      await this.upsertMembership(invitation.clubId, user.id, invitation.role, true);
      invitation.status = ClubInvitationStatus.ACCEPTED;
      invitation.acceptedByUserId = user.id;
      invitation.acceptedAt = new Date();
      await this.invitationsRepo.save(invitation);
    }
    return invitations.length;
  }

  /** Crea o actualiza la membresía del usuario en el club con los permisos dados. */
  private async upsertMembership(
    clubId: number,
    userId: number,
    role: ClubMemberRole,
    accepted: boolean,
  ): Promise<ClubMember> {
    const existing = await this.membersRepo.findOne({ where: { clubId, userId } });
    if (existing) {
      existing.role = role;
      if (accepted) existing.status = ClubMemberStatus.ACCEPTED;
      return this.membersRepo.save(existing);
    }
    return this.membersRepo.save(
      this.membersRepo.create({
        clubId,
        userId,
        role,
        status: accepted ? ClubMemberStatus.ACCEPTED : ClubMemberStatus.PENDING,
      }),
    );
  }
}
