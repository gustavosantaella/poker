import { apiClient } from './client';
import { Chip, ChipPayload, Paginated } from './types';

export async function fetchChips(): Promise<Paginated<Chip>> {
  const res = await apiClient.get('/chips', { params: { limit: 100 } });
  return res.data.data as Paginated<Chip>;
}

export async function createChip(payload: ChipPayload): Promise<Chip> {
  const res = await apiClient.post('/chips', payload);
  return res.data.data as Chip;
}

export async function updateChip(id: number, payload: ChipPayload): Promise<Chip> {
  const res = await apiClient.patch(`/chips/${id}`, payload);
  return res.data.data as Chip;
}

export async function deleteChip(id: number): Promise<void> {
  await apiClient.delete(`/chips/${id}`);
}