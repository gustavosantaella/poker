import { apiClient } from './client';
import { GameType, GameTypePayload, Paginated } from './types';

export async function fetchGameTypes(): Promise<GameType[]> {
  const res = await apiClient.get('/game-types/active');
  return res.data.data as GameType[];
}

export async function fetchAllGameTypes(): Promise<Paginated<GameType>> {
  const res = await apiClient.get('/game-types', { params: { limit: 100 } });
  return res.data.data as Paginated<GameType>;
}

export async function createGameType(payload: GameTypePayload): Promise<GameType> {
  const res = await apiClient.post('/game-types', payload);
  return res.data.data as GameType;
}

export async function updateGameType(id: number, payload: GameTypePayload): Promise<GameType> {
  const res = await apiClient.patch(`/game-types/${id}`, payload);
  return res.data.data as GameType;
}

export async function deleteGameType(id: number): Promise<void> {
  await apiClient.delete(`/game-types/${id}`);
}