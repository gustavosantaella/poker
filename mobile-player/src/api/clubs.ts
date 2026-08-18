import { apiClient } from './client';
import { Club, ClubMembership, Paginated, PokerTable, Tournament } from './types';

export async function fetchClubs(): Promise<Paginated<Club>> {
  const res = await apiClient.get('/clubs', { params: { limit: 100 } });
  return res.data.data as Paginated<Club>;
}

export async function fetchClub(id: number): Promise<Club> {
  const res = await apiClient.get(`/clubs/${id}`);
  return res.data.data as Club;
}

export async function fetchClubTables(clubId: number): Promise<Paginated<PokerTable>> {
  const res = await apiClient.get('/tables', { params: { limit: 100, clubId } });
  return res.data.data as Paginated<PokerTable>;
}

export async function fetchClubTournaments(clubId: number): Promise<Paginated<Tournament>> {
  const res = await apiClient.get('/tournaments', { params: { limit: 100, clubId } });
  return res.data.data as Paginated<Tournament>;
}

/** Solicitud de unión a un club por su código (queda pendiente hasta que el admin confirme). */
export async function joinClub(code: string): Promise<{ club: Club; membership: ClubMembership }> {
  const res = await apiClient.post('/clubs/join', { code });
  return res.data.data as { club: Club; membership: ClubMembership };
}

/** Clubs donde el usuario es miembro aceptado. */
export async function fetchMyClubs(): Promise<Club[]> {
  const res = await apiClient.get('/clubs/mine');
  return res.data.data as Club[];
}

/** Todas las membresías del usuario (estado por club). */
export async function fetchMyClubMemberships(): Promise<ClubMembership[]> {
  const res = await apiClient.get('/clubs/memberships/mine');
  return res.data.data as ClubMembership[];
}

