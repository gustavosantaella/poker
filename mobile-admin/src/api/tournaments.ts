import { apiClient } from './client';
import {
  BlindConfig,
  BlindStructureItem,
  BlindStructureSummary,
  Paginated,
  Tournament,
  TournamentPayload,
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