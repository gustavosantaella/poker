import { apiClient } from './client';
import { Club, ClubMember, Paginated, User } from './types';

export async function fetchClubs(): Promise<Paginated<Club>> {
  const res = await apiClient.get('/clubs', { params: { limit: 100 } });
  return res.data.data as Paginated<Club>;
}

export interface CreateClubPayload {
  name: string;
  photoUrl?: string;
  address?: string | null;
  phone?: string | null;
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
