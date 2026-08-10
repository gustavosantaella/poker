import { apiClient } from './client';
import { Paginated, PokerTable, TableReservation } from './types';

export async function fetchTables(): Promise<Paginated<PokerTable>> {
  const res = await apiClient.get('/tables', { params: { limit: 100 } });
  return res.data.data as Paginated<PokerTable>;
}

export async function fetchTable(id: number): Promise<PokerTable> {
  const res = await apiClient.get(`/tables/${id}`);
  return res.data.data as PokerTable;
}

export async function fetchTableReservations(tableId: number): Promise<TableReservation[]> {
  const res = await apiClient.get(`/tables/${tableId}/reservations`);
  return res.data.data as TableReservation[];
}

export async function createTableReservation(
  tableId: number,
  userId: number,
): Promise<TableReservation> {
  const res = await apiClient.post(`/tables/${tableId}/reservations`, { userId });
  return res.data.data as TableReservation;
}
