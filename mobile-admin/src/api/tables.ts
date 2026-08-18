import { apiClient } from './client';
import { Paginated, PokerTable, TablePayload, TableReservation } from './types';

export interface TableFilters {
  status?: string;
  gameTypeId?: number;
}

export async function fetchTables(filters: TableFilters = {}): Promise<Paginated<PokerTable>> {
  const res = await apiClient.get('/tables', { params: { limit: 100, ...filters } });
  return res.data.data as Paginated<PokerTable>;
}

export async function fetchTable(id: number): Promise<PokerTable> {
  const res = await apiClient.get(`/tables/${id}`);
  return res.data.data as PokerTable;
}

export async function createTable(payload: TablePayload): Promise<PokerTable> {
  const res = await apiClient.post('/tables', payload);
  return res.data.data as PokerTable;
}

export async function updateTable(id: number, payload: Partial<TablePayload>): Promise<PokerTable> {
  const res = await apiClient.patch(`/tables/${id}`, payload);
  return res.data.data as PokerTable;
}

export async function deleteTable(id: number): Promise<void> {
  await apiClient.delete(`/tables/${id}`);
}

export async function fetchTableReservations(tableId: number): Promise<TableReservation[]> {
  const res = await apiClient.get(`/tables/${tableId}/reservations`);
  return res.data.data as TableReservation[];
}

export async function removeTableReservation(tableId: number, reservationId: number): Promise<void> {
  await apiClient.delete(`/tables/${tableId}/reservations/${reservationId}`);
}