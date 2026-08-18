import { apiClient } from './client';
import {
  BlindConfig,
  BlindStructureItem,
  BlindStructureSummary,
  Paginated,
  ReservationStatus,
  Tournament,
  TournamentChip,
  TournamentPayload,
  TournamentPrize,
  TournamentReservation,
  User,
} from './types';

export async function fetchTournaments(): Promise<Paginated<Tournament>> {
  const res = await apiClient.get('/tournaments', { params: { limit: 100 } });
  return res.data.data as Paginated<Tournament>;
}

export async function fetchTournament(id: number): Promise<Tournament> {
  const res = await apiClient.get(`/tournaments/${id}`);
  return res.data.data as Tournament;
}

export interface GenerateStructureResult {
  items: BlindStructureItem[];
  summary: BlindStructureSummary;
}

export async function generateStructure(config: BlindConfig): Promise<GenerateStructureResult> {
  const res = await apiClient.post('/tournaments/generate-structure', config);
  return res.data.data as GenerateStructureResult;
}

export async function createTournament(payload: TournamentPayload): Promise<Tournament> {
  const res = await apiClient.post('/tournaments', payload);
  return res.data.data as Tournament;
}

export async function updateTournament(id: number, payload: Partial<TournamentPayload>): Promise<Tournament> {
  const res = await apiClient.patch(`/tournaments/${id}`, payload);
  return res.data.data as Tournament;
}

export async function deleteTournament(id: number): Promise<void> {
  await apiClient.delete(`/tournaments/${id}`);
}

export async function startTournament(id: number): Promise<Tournament> {
  const res = await apiClient.post(`/tournaments/${id}/start`);
  return res.data.data as Tournament;
}

export async function pauseTournament(id: number): Promise<Tournament> {
  const res = await apiClient.post(`/tournaments/${id}/pause`);
  return res.data.data as Tournament;
}

export async function resumeTournament(id: number): Promise<Tournament> {
  const res = await apiClient.post(`/tournaments/${id}/resume`);
  return res.data.data as Tournament;
}

export async function nextTournamentLevel(id: number): Promise<Tournament> {
  const res = await apiClient.post(`/tournaments/${id}/next-level`);
  return res.data.data as Tournament;
}

export async function fetchReservations(tournamentId: number): Promise<TournamentReservation[]> {
  const res = await apiClient.get(`/tournaments/${tournamentId}/reservations`);
  return res.data.data as TournamentReservation[];
}

export async function createReservation(
  tournamentId: number,
  userId: number,
): Promise<TournamentReservation> {
  const res = await apiClient.post(`/tournaments/${tournamentId}/reservations`, { userId });
  return res.data.data as TournamentReservation;
}

export async function updateReservation(
  tournamentId: number,
  reservationId: number,
  status: ReservationStatus,
  stack?: number,
  tableNumber?: number,
  seatNumber?: number,
): Promise<TournamentReservation> {
  const body: Record<string, unknown> = { status };
  if (stack != null) body.stack = stack;
  if (tableNumber != null) body.tableNumber = tableNumber;
  if (seatNumber != null) body.seatNumber = seatNumber;
  const res = await apiClient.patch(`/tournaments/${tournamentId}/reservations/${reservationId}`, body);
  return res.data.data as TournamentReservation;
}

export async function removeReservation(tournamentId: number, reservationId: number): Promise<void> {
  await apiClient.delete(`/tournaments/${tournamentId}/reservations/${reservationId}`);
}

export async function standUpReservation(tournamentId: number, reservationId: number): Promise<TournamentReservation> {
  const res = await apiClient.post(`/tournaments/${tournamentId}/reservations/${reservationId}/stand-up`);
  return res.data.data as TournamentReservation;
}

/** Eliminar jugador del torneo: deja de contar en "en juego" pero conserva su reserva. */
export async function eliminateReservation(
  tournamentId: number,
  reservationId: number,
): Promise<TournamentReservation> {
  const res = await apiClient.post(`/tournaments/${tournamentId}/reservations/${reservationId}/eliminate`);
  return res.data.data as TournamentReservation;
}

export async function rebuyReservation(
  tournamentId: number,
  reservationId: number,
  stack?: number,
  tableNumber?: number,
  seatNumber?: number,
): Promise<TournamentReservation> {
  const body: Record<string, unknown> = {};
  if (stack != null) body.stack = stack;
  if (tableNumber != null) body.tableNumber = tableNumber;
  if (seatNumber != null) body.seatNumber = seatNumber;
  const res = await apiClient.post(
    `/tournaments/${tournamentId}/reservations/${reservationId}/rebuy`,
    body,
  );
  return res.data.data as TournamentReservation;
}

export async function fetchTournamentChips(tournamentId: number): Promise<TournamentChip[]> {
  const res = await apiClient.get(`/tournaments/${tournamentId}/chips`);
  return res.data.data as TournamentChip[];
}

export async function addTournamentChip(
  tournamentId: number,
  chipId: number,
  discardLevel?: number,
): Promise<TournamentChip> {
  const res = await apiClient.post(`/tournaments/${tournamentId}/chips`, { chipId, discardLevel });
  return res.data.data as TournamentChip;
}

export async function removeTournamentChip(tournamentId: number, tournamentChipId: number): Promise<void> {
  await apiClient.delete(`/tournaments/${tournamentId}/chips/${tournamentChipId}`);
}

export async function fetchPrizes(tournamentId: number): Promise<TournamentPrize[]> {
  const res = await apiClient.get(`/tournaments/${tournamentId}/prizes`);
  return res.data.data as TournamentPrize[];
}

export async function updatePrizes(
  tournamentId: number,
  prizes: { place: number; amount: number }[],
): Promise<TournamentPrize[]> {
  const res = await apiClient.put(`/tournaments/${tournamentId}/prizes`, { prizes });
  return res.data.data as TournamentPrize[];
}

export async function fetchPlayers(): Promise<User[]> {
  const res = await apiClient.get('/tournaments/players');
  return res.data.data as User[];
}