import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Between, In, LessThan, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { CrudService } from '../../common/services/crud.service';
import { MailService } from '../mail/mail.service';
import { RealtimeService } from '../realtime/realtime.service';
import { PokerTable, TableStatus } from '../tables/entities/table.entity';
import { ReservationStatus, TournamentReservation } from '../tournaments/entities/tournament-reservation.entity';
import { Tournament, TournamentStatus } from '../tournaments/entities/tournament.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateClubDto } from './dto/create-club.dto';
import { CreateClubInvitationDto } from './dto/create-club-invitation.dto';
import { UpdateClubCollaboratorDto } from './dto/update-club-collaborator.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { UpdateClubMemberDto } from './dto/update-club-member.dto';
import { ClubAuditAction, ClubAuditLog } from './entities/club-audit-log.entity';
import { Club } from './entities/club.entity';
import { ClubInvitation, ClubInvitationStatus } from './entities/club-invitation.entity';
import { ClubMember, ClubMemberRole, ClubMemberStatus } from './entities/club-member.entity';

/** Punto de la serie diaria del dashboard. */
export interface ClubDailyMetric {
  /** Fecha en formato `YYYY-MM-DD`. */
  date: string;
  tournaments: number;
  players: number;
  revenue: number;
}

/** Jugador destacado del periodo. */
export interface ClubTopPlayer {
  userId: number;
  name: string;
  email: string;
  tournaments: number;
  reEntries: number;
}

/** Métricas de negocio del club calculadas a partir de las reservas de torneo. */
export interface ClubBusinessMetrics {
  /** Días cubiertos por las métricas de negocio. */
  periodDays: number;
  /** Entradas cobradas (buy-in + re-entradas) en el periodo. */
  revenue: number;
  /** Comisión del club (fee por jugador + adminFee) en el periodo. */
  rake: number;
  /** Dinero destinado a premios (revenue - rake). */
  prizePool: number;
  /** Entrada media por jugador. */
  averageTicket: number;
  /** Jugadores distintos en el periodo. */
  totalPlayers: number;
  /** Entradas totales (jugadores + re-entradas). */
  totalEntries: number;
  /** Re-entradas realizadas en el periodo. */
  reEntries: number;
  /** Ocupación media de los torneos del periodo (%). */
  averageOccupancy: number;
  /** Serie de los últimos 7 días para el gráfico. */
  daily: ClubDailyMetric[];
  /** Mejores jugadores del periodo. */
  topPlayers: ClubTopPlayer[];
}

/** Agregado por torneo usado internamente para calcular rake y ocupación. */
interface ClubTournamentAggregate {
  entries: number;
  players: number;
  buyIn: number;
  adminFeeType: string | null;
  adminFeeValue: number;
  maxPlayers: number;
  tableCount: number;
  startDate: Date;
}

/** Contadores e indicadores que alimentan el dashboard del club. */
export interface ClubStats extends ClubBusinessMetrics {
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
  /** Torneos programados en los próximos 7 días. */
  upcomingTournaments: number;
  /** Invitaciones pendientes ya caducadas (solo se informan). */
  expiredInvitations: number;
}


/**
 * Jerarquía de permisos dentro del club (menor = más permisos).
 * Un rol superior puede hacer todo lo que hace uno inferior.
 */
const CLUB_ROLE_RANK: Record<ClubMemberRole, number> = {
  [ClubMemberRole.ADMIN]: 0,
  [ClubMemberRole.OPERATOR]: 1,
  [ClubMemberRole.CASHIER]: 2,
  [ClubMemberRole.MEMBER]: 3,
};

/** Texto humano de cada rol (correos y auditoría). */
const CLUB_ROLE_LABEL: Record<ClubMemberRole, string> = {
  [ClubMemberRole.ADMIN]: 'Administrador',
  [ClubMemberRole.OPERATOR]: 'Operador',
  [ClubMemberRole.CASHIER]: 'Cajero',
  [ClubMemberRole.MEMBER]: 'Miembro',
};

const CLUB_ROLE_DESCRIPTION: Record<ClubMemberRole, string> = {
  [ClubMemberRole.ADMIN]:
    'Acceso total: configuración del club, equipo y permisos, torneos, mesas y cobros.',
  [ClubMemberRole.OPERATOR]:
    'Gestión completa de torneos y mesas del club, incluidas cierres de inscripción y premios.',
  [ClubMemberRole.CASHIER]:
    'Cobros, entradas, re-entradas y control de reservas y mesas durante el juego.',
  [ClubMemberRole.MEMBER]: 'Acceso de solo lectura a la agenda y las métricas del club.',
};

/** Permisos del solicitante dentro de un club. */
export interface ClubPermissions {
  club: Club;
  role: ClubMemberRole;
  /** `true` si el solicitante tiene fila aceptada en `club_members`. */
  isMember: boolean;
}

/** Recursos de los que se puede deducir el club en el guard de permisos. */
export type ClubResourceType = 'table' | 'tournament';

@Injectable()
export class ClubsService extends CrudService<Club> implements OnModuleInit {
  private readonly logger = new Logger(ClubsService.name);

  constructor(
    @InjectRepository(Club) repository: Repository<Club>,
    @InjectRepository(ClubMember) private readonly membersRepo: Repository<ClubMember>,
    @InjectRepository(ClubInvitation) private readonly invitationsRepo: Repository<ClubInvitation>,
    @InjectRepository(PokerTable) private readonly tablesRepo: Repository<PokerTable>,
    @InjectRepository(Tournament) private readonly tournamentsRepo: Repository<Tournament>,
    @InjectRepository(TournamentReservation)
    private readonly reservationsRepo: Repository<TournamentReservation>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(ClubAuditLog) private readonly auditRepo: Repository<ClubAuditLog>,
    private readonly mail: MailService,
    private readonly realtime: RealtimeService,
    private readonly config: ConfigService,
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
    const club = await super.update(id, dto as Partial<Club>);
    await this.audit({
      clubId: id,
      action: ClubAuditAction.CLUB_UPDATED,
      requester,
      targetType: 'club',
      targetId: id,
      summary: `${requester.name} actualizó la configuración del club`,
      metadata: { fields: Object.keys(dto) },
    });
    return club;
  }

  // ---------------- Permisos dentro del club ----------------

  /**
   * Comprueba que el solicitante pueda gestionar el club y devuelve el club.
   *
   * Tienen acceso: el admin global del sistema, el dueño del club
   * (`clubs.adminUserId`) y los colaboradores aceptados cuyo rol sea igual o
   * superior a alguno de los indicados en `roles`. Si se pasan varios roles, basta
   * con cumplir el MENOS privilegiado de ellos (p. ej. `[ADMIN, OPERATOR, CASHIER]`
   * equivale a "cajero o superior").
   */
  private async assertClubAccess(
    clubId: number,
    requester: User,
    roles: ClubMemberRole[] = [ClubMemberRole.ADMIN],
  ): Promise<Club> {
    const candidates = roles.length > 0 ? roles : [ClubMemberRole.ADMIN];
    const leastPrivileged = candidates.reduce(
      (lowest, role) => (CLUB_ROLE_RANK[role] > CLUB_ROLE_RANK[lowest] ? role : lowest),
      candidates[0],
    );
    const { club } = await this.assertClubRank(clubId, requester, leastPrivileged);
    return club;
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
    return (await this.resolvePermissions(club, requester)).role;
  }

  /**
   * Permisos efectivos del solicitante: el admin global manda en todos los clubes,
   * el dueño del club (`clubs.adminUserId`) es admin, y el resto depende de su fila
   * aceptada en `club_members`.
   */
  async resolvePermissions(clubOrId: Club | number, requester: User): Promise<ClubPermissions> {
    const club = typeof clubOrId === 'number' ? await this.findOne(clubOrId) : clubOrId;
    if (requester.role === UserRole.ADMIN || club.adminUserId === requester.id) {
      return { club, role: ClubMemberRole.ADMIN, isMember: true };
    }
    const membership = await this.membersRepo.findOne({
      where: { clubId: club.id, userId: requester.id, status: ClubMemberStatus.ACCEPTED },
    });
    return { club, role: membership?.role ?? ClubMemberRole.MEMBER, isMember: Boolean(membership) };
  }

  /**
   * Exige al menos el rol `required` en el club. Los roles superiores heredan los
   * permisos de los inferiores (admin > operador > cajero > miembro).
   */
  async assertClubRank(
    clubOrId: Club | number,
    requester: User,
    required: ClubMemberRole,
  ): Promise<ClubPermissions> {
    const permissions = await this.resolvePermissions(clubOrId, requester);
    const isGlobalAdmin = requester.role === UserRole.ADMIN;
    const hasRank = CLUB_ROLE_RANK[permissions.role] <= CLUB_ROLE_RANK[required];
    if (!isGlobalAdmin && (!permissions.isMember || !hasRank)) {
      throw new ForbiddenException(`You need the ${CLUB_ROLE_LABEL[required]} role in this club`);
    }
    return permissions;
  }

  /**
   * Club al que pertenece un recurso, para que el `ClubRolesGuard` pueda comprobar
   * permisos en rutas que solo reciben el id del recurso (`PATCH /tournaments/:id`).
   */
  async resolveClubIdForResource(resource: ClubResourceType, resourceId: number): Promise<number | null> {
    if (!Number.isInteger(resourceId) || resourceId <= 0) return null;
    if (resource === 'table') {
      const table = await this.tablesRepo.findOne({ where: { id: resourceId } });
      return table?.clubId ?? null;
    }
    if (resource === 'tournament') {
      const tournament = await this.tournamentsRepo.findOne({ where: { id: resourceId } });
      return tournament?.clubId ?? null;
    }
    return null;
  }

  /** Historial de acciones sensibles del club (solo el admin del club). */
  async listAuditLog(clubId: number, requester: User, limit = 50): Promise<ClubAuditLog[]> {
    await this.assertClubAccess(clubId, requester, [ClubMemberRole.ADMIN]);
    return this.auditRepo.find({
      where: { clubId },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  /**
   * Registra una acción en el historial del club y avisa a las apps conectadas.
   * Nunca interrumpe la operación de negocio si el registro falla.
   */
  private async audit(entry: {
    clubId: number;
    action: ClubAuditAction;
    requester?: User | null;
    targetType?: string | null;
    targetId?: number | null;
    summary?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          clubId: entry.clubId,
          action: entry.action,
          actorUserId: entry.requester?.id ?? null,
          actorName: entry.requester?.name ?? 'Sistema',
          targetType: entry.targetType ?? null,
          targetId: entry.targetId ?? null,
          summary: entry.summary ?? null,
          metadata: entry.metadata ?? null,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Could not write the club audit log (${entry.action}): ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
    // El dashboard abierto se refresca solo (stats, equipo, invitaciones...).
    this.realtime.emitClub(entry.clubId, 'club:updated', {
      clubId: entry.clubId,
      action: entry.action,
    });
  }


  /** Genera el código único que el admin comparte para invitar a un colaborador. */
  private generateInviteToken(): string {
    return randomBytes(16).toString('hex');
  }

  /** Fecha de caducidad de una invitación nueva (`CLUB_INVITATION_TTL_DAYS`, 7 por defecto). */
  private invitationExpiry(from: Date = new Date()): Date {
    const days = this.config.get<number>('mail.invitationTtlDays') ?? 7;
    return new Date(from.getTime() + Math.max(days, 1) * 24 * 60 * 60 * 1000);
  }

  /** Fecha larga en español para los correos (p. ej. "7 de octubre de 2026"). */
  private formatDate(date: Date | null): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(date);
  }

  /** Enlace que abre la app móvil en la pantalla indicada. */
  private deepLink(scheme: 'mobile' | 'admin', path: string): string {
    const value = this.config.get<string>(scheme === 'mobile' ? 'app.mobileScheme' : 'app.adminScheme');
    return `${value ?? 'PokerPros'}://${path}`;
  }

  /** Correos de los administradores del club (dueño + colaboradores con rol admin). */
  private async clubAdminEmails(club: Club): Promise<string[]> {
    const admins = await this.membersRepo.find({
      where: {
        clubId: club.id,
        status: ClubMemberStatus.ACCEPTED,
        role: ClubMemberRole.ADMIN,
      },
    });
    const ids = new Set<number>(admins.map((member) => member.userId));
    ids.add(club.adminUserId);
    const users = await this.usersRepo.find({ where: { id: In([...ids]) } });
    return [...new Set(users.map((user) => (user.email ?? '').toLowerCase()).filter(Boolean))];
  }

  /**
   * Envía el correo con el código de invitación. Si el envío falla, la invitación
   * sigue siendo válida y el admin puede reenviarla o copiar el código a mano.
   */
  private async sendInvitationEmail(
    club: Club,
    invitation: ClubInvitation,
    inviter: User | null,
  ): Promise<boolean> {
    const sent = await this.mail.send({
      to: invitation.email,
      subject: `${inviter?.name ?? 'El equipo'} te invita a colaborar en ${club.name}`,
      category: 'club-invitation',
      template: 'club-invitation',
      variables: {
        subject: `Invitación para colaborar en ${club.name}`,
        eyebrow: 'Invitación de club',
        clubName: club.name,
        inviterName: inviter?.name ?? 'El equipo del club',
        email: invitation.email,
        roleLabel: CLUB_ROLE_LABEL[invitation.role],
        roleDescription: CLUB_ROLE_DESCRIPTION[invitation.role],
        token: invitation.token,
        deepLink: this.deepLink('mobile', `invite?token=${invitation.token}`),
        expiresAt: this.formatDate(invitation.expiresAt),
        year: new Date().getFullYear(),
      },
    });
    if (sent) {
      invitation.lastSentAt = new Date();
      invitation.sendCount = (invitation.sendCount ?? 0) + 1;
      await this.invitationsRepo.save(invitation);
    }
    return sent;
  }

  /** Avisa al equipo del club de que alguien ha aceptado la invitación. */
  private async notifyCollaboratorJoined(
    club: Club,
    user: User,
    role: ClubMemberRole,
  ): Promise<void> {
    const [emails, collaborators] = await Promise.all([
      this.clubAdminEmails(club),
      this.membersRepo.count({
        where: {
          clubId: club.id,
          status: ClubMemberStatus.ACCEPTED,
          role: Not(ClubMemberRole.MEMBER),
        },
      }),
    ]);
    await Promise.all(
      emails.map((email) =>
        this.mail.send({
          to: email,
          subject: `Nuevo colaborador en ${club.name}`,
          category: 'club-collaborator-joined',
          template: 'club-invitation-accepted',
          variables: {
            subject: `Nuevo colaborador en ${club.name}`,
            eyebrow: 'Equipo del club',
            clubName: club.name,
            collaboratorName: user.name ?? user.email,
            collaboratorEmail: user.email,
            roleLabel: CLUB_ROLE_LABEL[role],
            collaborators,
            deepLink: this.deepLink('admin', `club/${club.id}`),
            year: new Date().getFullYear(),
          },
        }),
      ),
    );
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
    const previousRole = member.role;
    member.role = dto.role;
    member.status = ClubMemberStatus.ACCEPTED;
    const saved = await this.membersRepo.save(member);
    const target = await this.usersRepo.findOne({ where: { id: member.userId } });
    await this.audit({
      clubId,
      action: ClubAuditAction.COLLABORATOR_ROLE_CHANGED,
      requester,
      targetType: 'collaborator',
      targetId: member.id,
      summary: `${requester.name} cambió el rol de ${target?.name ?? `usuario #${member.userId}`} de ${CLUB_ROLE_LABEL[previousRole]} a ${CLUB_ROLE_LABEL[dto.role]}`,
      metadata: { previousRole, newRole: dto.role, userId: member.userId, email: target?.email ?? null },
    });
    return saved;
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
    const target = await this.usersRepo.findOne({ where: { id: member.userId } });
    await this.audit({
      clubId,
      action: ClubAuditAction.MEMBER_STATUS_CHANGED,
      requester,
      targetType: 'member',
      targetId: member.id,
      summary: `${requester.name} marcó la solicitud de ${target?.name ?? `usuario #${member.userId}`} como ${dto.status}`,
      metadata: { status: dto.status, userId: member.userId },
    });
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
    const target = await this.usersRepo.findOne({ where: { id: member.userId } });
    await this.membersRepo.delete(member.id);
    await this.audit({
      clubId,
      action:
        member.role === ClubMemberRole.MEMBER
          ? ClubAuditAction.MEMBER_STATUS_CHANGED
          : ClubAuditAction.COLLABORATOR_REMOVED,
      requester,
      targetType: member.role === ClubMemberRole.MEMBER ? 'member' : 'collaborator',
      targetId: member.id,
      summary: `${requester.name} retiró a ${target?.name ?? `usuario #${member.userId}`} (${CLUB_ROLE_LABEL[member.role]}) del club`,
      metadata: { userId: member.userId, email: target?.email ?? null, role: member.role },
    });
  }

  // ---------------- Métricas del club (dashboard) ----------------

  /** Resumen del club para el dashboard: miembros, colaboradores, torneos y mesas. */
  async stats(clubId: number, requester: User): Promise<ClubStats> {
    // Antes de contar nada, se marcan como caducadas las invitaciones vencidas.
    await this.expirePendingInvitations(clubId);
    // Las métricas de negocio (tesorería, rake, ocupación) son para el equipo del
    // club: admin, operadores y cajeros.
    const club = await this.assertClubAccess(clubId, requester, [
      ClubMemberRole.ADMIN,
      ClubMemberRole.OPERATOR,
      ClubMemberRole.CASHIER,
    ]);
    const now = new Date();
    const inAWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [
      myRole,
      members,
      collaborators,
      pendingMembers,
      pendingInvitations,
      expiredInvitations,
      tournaments,
      activeTournaments,
      tables,
      openTables,
      upcomingTournaments,
      metrics,
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
      this.invitationsRepo.count({ where: { clubId, status: ClubInvitationStatus.EXPIRED } }),
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
      this.tournamentsRepo.count({
        where: {
          clubId,
          isActive: true,
          startDate: Between(now, inAWeek),
          status: Not(In([TournamentStatus.CANCELLED, TournamentStatus.COMPLETED])),
        },
      }),
      this.businessMetrics(clubId),
    ]);

    return {
      clubId,
      myRole,
      members,
      collaborators,
      pendingMembers,
      pendingInvitations,
      expiredInvitations,
      tournaments,
      activeTournaments,
      tables,
      openTables,
      upcomingTournaments,
      ...metrics,
    };
  }

  /**
   * Métricas de negocio del club (últimos 30 días) a partir de las reservas de
   * torneo: entradas cobradas, comisión del club, premios, ocupación media, serie
   * diaria y mejores jugadores.
   *
   * Se agrega en memoria en lugar de con SQL porque los mismos datos alimentan
   * varios cálculos (rake por torneo, ocupación, ranking) y el volumen mensual de
   * un club es de unos pocos miles de filas.
   *
   * Nota: los importes se suman sin separar por divisa (el club funciona con una
   * sola moneda); el dashboard lo advierte en la interfaz.
   */
  private async businessMetrics(clubId: number, periodDays = 30): Promise<ClubBusinessMetrics> {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (periodDays - 1));

    const rows = await this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoin('tournaments', 't', 't.id = r.tournament_id')
      .leftJoin('users', 'u', 'u.id = r.user_id')
      .select('r.tournament_id', 'tournamentId')
      .addSelect('r.user_id', 'userId')
      .addSelect('r.reEntries', 'reEntries')
      .addSelect('u.name', 'userName')
      .addSelect('u.email', 'userEmail')
      .addSelect('t.buyIn', 'buyIn')
      .addSelect('t.fee', 'fee')
      .addSelect('t.adminFeeType', 'adminFeeType')
      .addSelect('t.adminFeeValue', 'adminFeeValue')
      .addSelect('t.startDate', 'startDate')
      .addSelect('t.maxPlayers', 'maxPlayers')
      .addSelect('t.tableCount', 'tableCount')
      .where('t.club_id = :clubId', { clubId })
      .andWhere('r.status IN (:...statuses)', {
        statuses: [
          ReservationStatus.ACCEPTED,
          ReservationStatus.STOOD_UP,
          ReservationStatus.ELIMINATED,
        ],
      })
      .andWhere('t.startDate >= :from', { from })
      .getRawMany<Record<string, unknown>>();

    const tournaments = new Map<number, ClubTournamentAggregate>();
    const players = new Map<number, ClubTopPlayer>();
    let revenue = 0;
    let rake = 0;
    let entries = 0;
    let reEntries = 0;

    for (const row of rows) {
      const tournamentId = Number(row.tournamentId);
      const userId = Number(row.userId);
      const buyIn = Number(row.buyIn ?? 0);
      const fee = Number(row.fee ?? 0);
      const re = Number(row.reEntries ?? 0);
      const playerEntries = 1 + re;

      revenue += buyIn * playerEntries;
      rake += fee * playerEntries;
      entries += playerEntries;
      reEntries += re;

      const tournament = tournaments.get(tournamentId) ?? {
        entries: 0,
        players: 0,
        buyIn,
        adminFeeType: (row.adminFeeType as string | null) ?? null,
        adminFeeValue: Number(row.adminFeeValue ?? 0),
        maxPlayers: Number(row.maxPlayers ?? 0),
        tableCount: Number(row.tableCount ?? 1),
        startDate: new Date(row.startDate as string),
      };
      tournament.entries += playerEntries;
      tournament.players += 1;
      tournaments.set(tournamentId, tournament);

      const player = players.get(userId) ?? {
        userId,
        name: (row.userName as string | null) ?? `Jugador #${userId}`,
        email: (row.userEmail as string | null) ?? '',
        tournaments: 0,
        reEntries: 0,
      };
      player.tournaments += 1;
      player.reEntries += re;
      players.set(userId, player);
    }

    // La comisión por torneo se cobra una sola vez (no por entrada).
    for (const tournament of tournaments.values()) {
      rake +=
        tournament.adminFeeType === 'percent'
          ? (tournament.buyIn * tournament.entries * tournament.adminFeeValue) / 100
          : tournament.adminFeeValue;
    }

    // Ocupación media: jugadores inscritos sobre el aforo configurado. Si el torneo
    // no define aforo, se estima a 9 jugadores por mesa.
    let occupancySum = 0;
    for (const tournament of tournaments.values()) {
      const capacity =
        tournament.maxPlayers > 0 ? tournament.maxPlayers : Math.max(tournament.tableCount, 1) * 9;
      occupancySum += Math.min(tournament.players / capacity, 1);
    }
    const averageOccupancy =
      tournaments.size > 0 ? Math.round((occupancySum / tournaments.size) * 100) : 0;

    // Serie de los últimos 7 días (incluye hoy) para el gráfico del dashboard.
    const daily: ClubDailyMetric[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - offset);
      daily.push({ date: this.dayKey(day), tournaments: 0, players: 0, revenue: 0 });
    }
    const buckets = new Map(daily.map((entry) => [entry.date, entry]));
    for (const tournament of tournaments.values()) {
      const bucket = buckets.get(this.dayKey(tournament.startDate));
      if (!bucket) continue;
      bucket.tournaments += 1;
      bucket.players += tournament.players;
      bucket.revenue += tournament.entries * tournament.buyIn;
    }

    const topPlayers = [...players.values()]
      .sort((a, b) => b.tournaments - a.tournaments || b.reEntries - a.reEntries)
      .slice(0, 5);

    return {
      periodDays,
      revenue: this.round2(revenue),
      rake: this.round2(rake),
      prizePool: this.round2(Math.max(revenue - rake, 0)),
      averageTicket: entries > 0 ? this.round2(revenue / entries) : 0,
      totalPlayers: players.size,
      totalEntries: entries,
      reEntries,
      averageOccupancy,
      daily,
      topPlayers,
    };
  }

  /** Clave `YYYY-MM-DD` en hora local (agrupa la serie diaria). */
  private dayKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  /** Redondeo a dos decimales para importes monetarios. */
  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Marca como caducadas las invitaciones pendientes cuya fecha ya pasó, para que
   * el panel muestre el estado real y no se pueda aceptar un código vencido.
   */
  private async expirePendingInvitations(clubId: number): Promise<number> {
    const result = await this.invitationsRepo.update(
      { clubId, status: ClubInvitationStatus.PENDING, expiresAt: LessThan(new Date()) },
      { status: ClubInvitationStatus.EXPIRED },
    );
    return result.affected ?? 0;
  }

  // ---------------- Invitaciones de colaboradores ----------------

  /** Invitaciones del club (pendientes, aceptadas, revocadas y caducadas). */
  async listInvitations(clubId: number, requester: User): Promise<ClubInvitation[]> {
    await this.assertClubAccess(clubId, requester, [ClubMemberRole.ADMIN]);
    await this.expirePendingInvitations(clubId);
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

    // Límite anti-abuso: evita que una cuenta comprometida use el club como
    // plataforma de spam (50 invitaciones por club y día).
    const createdToday = await this.invitationsRepo.count({
      where: { clubId, createdAt: MoreThanOrEqual(new Date(Date.now() - 24 * 60 * 60 * 1000)) },
    });
    if (createdToday >= 50) {
      throw new BadRequestException('Daily invitation limit reached for this club');
    }

    // Reutiliza la invitación pendiente del mismo correo para no duplicar códigos,
    // renovando su caducidad.
    const pending = await this.invitationsRepo.findOne({
      where: { clubId, email, status: ClubInvitationStatus.PENDING },
    });
    let invitation: ClubInvitation;
    if (pending) {
      pending.role = dto.role;
      pending.invitedByUserId = requester.id;
      pending.expiresAt = this.invitationExpiry();
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
          expiresAt: this.invitationExpiry(),
        }),
      );
    }

    // Si la cuenta ya existe, entra al club directamente con los permisos asignados
    // y no hace falta enviar el código por correo.
    if (user) {
      await this.upsertMembership(clubId, user.id, dto.role, true);
      invitation.status = ClubInvitationStatus.ACCEPTED;
      invitation.acceptedByUserId = user.id;
      invitation.acceptedAt = new Date();
      invitation = await this.invitationsRepo.save(invitation);
      await Promise.all([
        this.audit({
          clubId,
          action: ClubAuditAction.INVITATION_CREATED,
          requester,
          targetType: 'invitation',
          targetId: invitation.id,
          summary: `${requester.name} añadió a ${user.name ?? email} como ${CLUB_ROLE_LABEL[dto.role]}`,
          metadata: { email, role: dto.role, accepted: true, userId: user.id },
        }),
        this.notifyCollaboratorJoined(club, user, dto.role),
      ]);
      return { club, invitation, accepted: true, emailSent: false };
    }

    const emailSent = await this.sendInvitationEmail(club, invitation, requester);
    await this.audit({
      clubId,
      action: ClubAuditAction.INVITATION_CREATED,
      requester,
      targetType: 'invitation',
      targetId: invitation.id,
      summary: `${requester.name} invitó a ${email} como ${CLUB_ROLE_LABEL[dto.role]}`,
      metadata: {
        email,
        role: dto.role,
        accepted: false,
        emailSent,
        expiresAt: invitation.expiresAt,
      },
    });

    return { club, invitation, accepted: false, emailSent };
  }

  /**
   * Reenvía la invitación: rota el código (invalida el anterior), renueva la
   * caducidad y vuelve a enviar el correo. Sirve tanto para recordatorios como
   * para reactivar invitaciones caducadas.
   */
  async resendInvitation(clubId: number, invitationId: number, requester: User) {
    const club = await this.assertClubAccess(clubId, requester, [ClubMemberRole.ADMIN]);
    const invitation = await this.invitationsRepo.findOne({ where: { id: invitationId, clubId } });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status === ClubInvitationStatus.ACCEPTED) {
      throw new BadRequestException('This invitation has already been accepted');
    }
    if (invitation.status === ClubInvitationStatus.REVOKED) {
      throw new BadRequestException('This invitation was revoked: create a new one');
    }

    // Solo tiene sentido mientras no exista ya una cuenta con ese correo dentro del
    // club (en ese caso hay que cambiar permisos, no invitar).
    const existingUser = await this.usersRepo.findOne({ where: { email: invitation.email } });
    if (existingUser) {
      const membership = await this.membersRepo.findOne({
        where: { clubId, userId: existingUser.id },
      });
      if (membership?.status === ClubMemberStatus.ACCEPTED) {
        throw new BadRequestException('That person is already a collaborator of the club');
      }
    }

    invitation.token = this.generateInviteToken();
    invitation.expiresAt = this.invitationExpiry();
    invitation.status = ClubInvitationStatus.PENDING;
    const saved = await this.invitationsRepo.save(invitation);
    const emailSent = await this.sendInvitationEmail(club, saved, requester);
    await this.audit({
      clubId,
      action: ClubAuditAction.INVITATION_RESENT,
      requester,
      targetType: 'invitation',
      targetId: saved.id,
      summary: `${requester.name} reenvió la invitación de ${saved.email} como ${CLUB_ROLE_LABEL[saved.role]}`,
      metadata: {
        email: saved.email,
        role: saved.role,
        sendCount: saved.sendCount,
        emailSent,
        expiresAt: saved.expiresAt,
      },
    });
    return { invitation: saved, emailSent };
  }

  /** Revoca una invitación que todavía no se ha aceptado. */
  async revokeInvitation(clubId: number, invitationId: number, requester: User): Promise<void> {
    await this.assertClubAccess(clubId, requester, [ClubMemberRole.ADMIN]);
    const invitation = await this.invitationsRepo.findOne({ where: { id: invitationId, clubId } });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (
      invitation.status !== ClubInvitationStatus.PENDING &&
      invitation.status !== ClubInvitationStatus.EXPIRED
    ) {
      throw new BadRequestException('Only pending invitations can be revoked');
    }
    invitation.status = ClubInvitationStatus.REVOKED;
    await this.invitationsRepo.save(invitation);
    await this.audit({
      clubId,
      action: ClubAuditAction.INVITATION_REVOKED,
      requester,
      targetType: 'invitation',
      targetId: invitation.id,
      summary: `${requester.name} revocó la invitación de ${invitation.email}`,
      metadata: { email: invitation.email, role: invitation.role },
    });
  }

  /**
   * Traspasa la propiedad del club a otro miembro.
   *
   * Solo el propietario actual (o un admin global) puede hacerlo. El nuevo dueño
   * pasa a admin y el anterior baja a operador para no perder el acceso al club
   * (evita clubes huérfanos que nadie puede administrar).
   */
  async transferOwnership(clubId: number, newOwnerUserId: number, requester: User): Promise<Club> {
    const club = await this.assertClubAccess(clubId, requester, [ClubMemberRole.ADMIN]);
    if (requester.role !== UserRole.ADMIN && club.adminUserId !== requester.id) {
      throw new ForbiddenException('Only the club owner can transfer ownership');
    }
    if (newOwnerUserId === club.adminUserId) {
      throw new BadRequestException('That user is already the club owner');
    }
    const newOwner = await this.usersRepo.findOne({ where: { id: newOwnerUserId } });
    if (!newOwner) {
      throw new NotFoundException('User not found');
    }
    const membership = await this.membersRepo.findOne({ where: { clubId, userId: newOwnerUserId } });
    if (!membership) {
      throw new BadRequestException('The new owner must be a member of the club');
    }

    const previousOwnerId = club.adminUserId;
    const previousOwner = await this.usersRepo.findOne({ where: { id: previousOwnerId } });

    await this.upsertMembership(clubId, newOwnerUserId, ClubMemberRole.ADMIN, true);
    if (previousOwner) {
      await this.upsertMembership(clubId, previousOwnerId, ClubMemberRole.OPERATOR, true);
    }
    club.adminUserId = newOwnerUserId;
    await this.repository.save(club);

    await this.audit({
      clubId,
      action: ClubAuditAction.OWNERSHIP_TRANSFERRED,
      requester,
      targetType: 'collaborator',
      targetId: membership.id,
      summary: `${requester.name} traspasó la propiedad del club a ${newOwner.name ?? newOwner.email}`,
      metadata: { previousOwnerId, newOwnerUserId, newOwnerEmail: newOwner.email },
    });

    await this.notifyOwnershipTransferred(club, previousOwner, newOwner);
    return club;
  }

  /** Avisa por correo al antiguo y al nuevo propietario del club. */
  private async notifyOwnershipTransferred(
    club: Club,
    previousOwner: User | null,
    newOwner: User,
  ): Promise<void> {
    const base = {
      eyebrow: 'Propiedad del club',
      clubName: club.name,
      previousOwner: previousOwner?.name ?? 'El propietario anterior',
      newOwner: newOwner.name ?? newOwner.email,
      deepLink: this.deepLink('admin', `club/${club.id}`),
      showAdminButton: true,
      year: new Date().getFullYear(),
    };
    const sends: Promise<boolean>[] = [];
    if (newOwner.email) {
      sends.push(
        this.mail.send({
          to: newOwner.email,
          subject: `Ahora eres el propietario de ${club.name}`,
          category: 'club-ownership-transferred',
          template: 'club-ownership-transferred',
          variables: {
            ...base,
            subject: `Ahora eres el propietario de ${club.name}`,
            message:
              'Tienes permisos completos sobre el club: invita al equipo, gestiona torneos y revisa la auditoría.',
          },
        }),
      );
    }
    if (previousOwner?.email) {
      sends.push(
        this.mail.send({
          to: previousOwner.email,
          subject: `Has traspasado ${club.name}`,
          category: 'club-ownership-transferred',
          template: 'club-ownership-transferred',
          variables: {
            ...base,
            subject: `Has traspasado ${club.name}`,
            message: `El club ya pertenece a ${newOwner.name ?? newOwner.email}. Sigues dentro como operador con tus permisos habituales.`,
          },
        }),
      );
    }
    await Promise.all(sends);
  }

  /** Rota el código de invitación del club (invalida el anterior). */
  async rotateClubCode(clubId: number, requester: User): Promise<Club> {
    const club = await this.assertClubAccess(clubId, requester, [ClubMemberRole.ADMIN]);
    const previousCode = club.code;
    club.code = await this.generateUniqueCode();
    await this.repository.save(club);
    await this.audit({
      clubId,
      action: ClubAuditAction.CODE_ROTATED,
      requester,
      targetType: 'club',
      targetId: clubId,
      summary: `${requester.name} regeneró el código de invitación del club`,
      metadata: { previousCode, code: club.code },
    });
    return club;
  }

  /**
   * Invitaciones dirigidas al correo de un usuario y todavía vigentes. Las
   * caducadas se marcan como tal para que desaparezcan de la app.
   */
  async myInvitations(user: User): Promise<ClubInvitation[]> {
    const email = (user.email ?? '').toLowerCase();
    if (!email) return [];
    await this.invitationsRepo.update(
      { email, status: ClubInvitationStatus.PENDING, expiresAt: LessThan(new Date()) },
      { status: ClubInvitationStatus.EXPIRED },
    );
    return this.invitationsRepo.find({
      where: { email, status: ClubInvitationStatus.PENDING },
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
    if (invitation.expiresAt && invitation.expiresAt.getTime() <= Date.now()) {
      invitation.status = ClubInvitationStatus.EXPIRED;
      await this.invitationsRepo.save(invitation);
      throw new BadRequestException('This invitation has expired');
    }
    const membership = await this.upsertMembership(invitation.clubId, user.id, invitation.role, true);
    invitation.status = ClubInvitationStatus.ACCEPTED;
    invitation.acceptedByUserId = user.id;
    invitation.acceptedAt = new Date();
    await this.invitationsRepo.save(invitation);
    await this.audit({
      clubId: invitation.clubId,
      action: ClubAuditAction.INVITATION_ACCEPTED,
      requester: user,
      targetType: 'invitation',
      targetId: invitation.id,
      summary: `${user.name ?? user.email} aceptó la invitación como ${CLUB_ROLE_LABEL[invitation.role]}`,
      metadata: { email: invitation.email, role: invitation.role, membershipId: membership.id },
    });
    const club = invitation.club ?? (await this.repository.findOne({ where: { id: invitation.clubId } }));
    if (club) {
      await this.notifyCollaboratorJoined(club, user, invitation.role);
    }
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
    const now = new Date();
    let accepted = 0;
    for (const invitation of invitations) {
      // Las invitaciones caducadas se descartan (y quedan marcadas como tal).
      if (!invitation.isUsable(now)) {
        if (invitation.isExpired(now)) {
          invitation.status = ClubInvitationStatus.EXPIRED;
          await this.invitationsRepo.save(invitation);
        }
        continue;
      }
      const membership = await this.upsertMembership(
        invitation.clubId,
        user.id,
        invitation.role,
        true,
      );
      invitation.status = ClubInvitationStatus.ACCEPTED;
      invitation.acceptedByUserId = user.id;
      invitation.acceptedAt = new Date();
      await this.invitationsRepo.save(invitation);
      await this.audit({
        clubId: invitation.clubId,
        action: ClubAuditAction.INVITATION_ACCEPTED,
        requester: user,
        targetType: 'invitation',
        targetId: invitation.id,
        summary: `${user.name ?? user.email} aceptó la invitación como ${CLUB_ROLE_LABEL[invitation.role]}`,
        metadata: { email, role: invitation.role, membershipId: membership.id, automatic: true },
      });
      const club =
        invitation.club ?? (await this.repository.findOne({ where: { id: invitation.clubId } }));
      if (club) {
        await this.notifyCollaboratorJoined(club, user, invitation.role);
      }
      accepted += 1;
    }
    return accepted;
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
