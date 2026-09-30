import { apiClient } from './client';
import {
  Club,
  ClubAuditLog,
  ClubInvitation,
  ClubMember,
  ClubMemberRole,
  ClubStats,
  Paginated,
  User,
} from './types';

export async function fetchClubs(): Promise<Paginated<Club>> {
  const res = await apiClient.get('/clubs', { params: { limit: 100 } });
  return res.data.data as Paginated<Club>;
}

export interface CreateClubPayload {
  name: string;
  photoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  /** Ubicación del club (opcional; el admin puede usar su ubicación actual). */
  latitude?: number | null;
  longitude?: number | null;
  /** Redes sociales (opcionales). */
  instagram?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  adminUserId?: number;
}

export async function createClub(payload: CreateClubPayload): Promise<Club> {
  const res = await apiClient.post('/clubs', payload);
  return res.data.data as Club;
}

export async function updateClub(id: number, payload: Partial<CreateClubPayload>): Promise<Club> {
  const res = await apiClient.patch(`/clubs/${id}`, payload);
  return res.data.data as Club;
}

/** Lista de usuarios del sistema (para elegir el admin de un club). */
export async function fetchUsers(): Promise<Paginated<User>> {
  const res = await apiClient.get('/users', { params: { limit: 100 } });
  return res.data.data as Paginated<User>;
}

export async function fetchClubMembers(clubId: number): Promise<ClubMember[]> {
  const res = await apiClient.get(`/clubs/${clubId}/members`);
  return res.data.data as ClubMember[];
}

export async function updateClubMember(
  clubId: number,
  memberId: number,
  status: 'accepted' | 'rejected',
): Promise<ClubMember> {
  const res = await apiClient.patch(`/clubs/${clubId}/members/${memberId}`, { status });
  return res.data.data as ClubMember;
}

export async function removeClubMember(clubId: number, memberId: number): Promise<void> {
  await apiClient.delete(`/clubs/${clubId}/members/${memberId}`);
}

/** Detalle de un club (configuración, código, ubicación y redes). */
export async function fetchClub(id: number): Promise<Club> {
  const res = await apiClient.get(`/clubs/${id}`);
  return res.data.data as Club;
}

// ---- Dashboard del club ----

/** Métricas del club: miembros, colaboradores, torneos en curso, mesas cash... */
export async function fetchClubStats(clubId: number): Promise<ClubStats> {
  const res = await apiClient.get(`/clubs/${clubId}/stats`);
  return res.data.data as ClubStats;
}

/** Historial de acciones sensibles del club (equipo, permisos, propiedad...). */
export async function fetchClubAuditLog(clubId: number, limit = 50): Promise<ClubAuditLog[]> {
  const res = await apiClient.get(`/clubs/${clubId}/audit`, { params: { limit } });
  return res.data.data as ClubAuditLog[];
}

// ---- Colaboradores y permisos ----

/** Colaboradores del club (admin, operadores y cajeros) con sus permisos. */
export async function fetchClubCollaborators(clubId: number): Promise<ClubMember[]> {
  const res = await apiClient.get(`/clubs/${clubId}/collaborators`);
  return res.data.data as ClubMember[];
}

/** Cambia los permisos de un colaborador dentro del club. */
export async function updateClubCollaborator(
  clubId: number,
  memberId: number,
  role: ClubMemberRole,
): Promise<ClubMember> {
  const res = await apiClient.patch(`/clubs/${clubId}/collaborators/${memberId}`, { role });
  return res.data.data as ClubMember;
}

// ---- Invitaciones ----

/** Invitaciones del club (pendientes y aceptadas). */
export async function fetchClubInvitations(clubId: number): Promise<ClubInvitation[]> {
  const res = await apiClient.get(`/clubs/${clubId}/invitations`);
  return res.data.data as ClubInvitation[];
}

/**
 * Invita a un colaborador por correo con unos permisos.
 * `accepted` = true significa que esa cuenta ya existía y entró al club al instante.
 * `emailSent` = false significa que el correo no salió (hay que compartir el código a mano).
 */
export async function createClubInvitation(
  clubId: number,
  email: string,
  role: ClubMemberRole,
): Promise<CreateClubInvitationResult> {
  const res = await apiClient.post(`/clubs/${clubId}/invitations`, { email, role });
  return res.data.data as CreateClubInvitationResult;
}

/** Resultado de invitar (o reenviar): la invitación, si entró al instante y si salió el correo. */
export interface CreateClubInvitationResult {
  club?: Club;
  invitation: ClubInvitation;
  accepted: boolean;
  emailSent: boolean;
  expiresAt?: string | null;
}

/** Reenvía una invitación: rota el código, renueva la caducidad y vuelve a enviar el correo. */
export async function resendClubInvitation(
  clubId: number,
  invitationId: number,
): Promise<{ invitation: ClubInvitation; emailSent: boolean }> {
  const res = await apiClient.post(`/clubs/${clubId}/invitations/${invitationId}/resend`);
  return res.data.data as { invitation: ClubInvitation; emailSent: boolean };
}

/** Revoca una invitación que todavía no se ha aceptado (o ya caducada). */
export async function revokeClubInvitation(clubId: number, invitationId: number): Promise<void> {
  await apiClient.delete(`/clubs/${clubId}/invitations/${invitationId}`);
}

// ---- Propiedad y código del club ----

/**
 * Traspasa la propiedad del club a otro usuario: pasa a admin y el propietario
 * actual queda como operador (solo puede hacerlo el propietario actual).
 */
export async function transferClubOwnership(clubId: number, userId: number): Promise<Club> {
  const res = await apiClient.post(`/clubs/${clubId}/transfer-ownership`, { userId });
  return res.data.data as Club;
}

/** Regenera el código de invitación del club (el anterior deja de valer). */
export async function rotateClubCode(clubId: number): Promise<Club> {
  const res = await apiClient.post(`/clubs/${clubId}/rotate-code`);
  return res.data.data as Club;
}

/** Acepta una invitación con el código compartido por el admin del club. */
export async function acceptClubInvitation(token: string): Promise<ClubMember> {
  const res = await apiClient.post(`/clubs/invitations/${token}/accept`);
  return (res.data.data as { membership: ClubMember }).membership;
}
