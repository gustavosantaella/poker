import { apiClient } from './client';
import { Paginated, Tournament, TournamentReservation } from './types';

export async function fetchTournaments(): Promise<Paginated<Tournament>> {
  const res = await apiClient.get('/tournaments', { params: { limit: 100 } });
  return res.data.data as Paginated<Tournament>;
}

export async function fetchTournament(id: number): Promise<Tournament> {
  const res = await apiClient.get(`/tournaments/${id}`);
  return res.data.data as Tournament;
}

export async function fetchTournamentReservations(tournamentId: number): Promise<TournamentReservation[]> {
  const res = await apiClient.get(`/tournaments/${tournamentId}/reservations`);
  return res.data.data as TournamentReservation[];
}

export async function createTournamentReservation(
  tournamentId: number,
  userId: number,
): Promise<TournamentReservation> {
  const res = await apiClient.post(`/tournaments/${tournamentId}/reservations`, { userId });
  return res.data.data as TournamentReservation;
}
