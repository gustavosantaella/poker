import { apiClient } from './client';
import { Club, PokerTable, Tournament } from './types';

export interface DealerContext {
  club: Club | null;
  tables: PokerTable[];
  tournaments: Tournament[];
}

export interface DealerSeat {
  seat: number;
  player: { reservationId: number; userId: number; name: string; stack: number | null } | null;
}

export interface DealerAssignment {
  id: number;
  dealerId: number;
  clubId: number;
  tournamentId: number | null;
  tableId: number | null;
  tableNumber: number | null;
  status: string;
  tournament?: Tournament | null;
  table?: PokerTable | null;
  createdAt: string;
}

export async function fetchDealerContext(): Promise<DealerContext> {
  const res = await apiClient.get('/dealer/context');
  return res.data.data as DealerContext;
}

export async function dealerAssign(payload: {
  tournamentId?: number;
  tableId?: number;
  tableNumber?: number;
}): Promise<DealerAssignment> {
  const res = await apiClient.post('/dealer/assign', payload);
  return res.data.data as DealerAssignment;
}

export async function fetchDealerAssignment(): Promise<{
  assignment: DealerAssignment | null;
  seats: DealerSeat[];
}> {
  const res = await apiClient.get('/dealer/assignment');
  return res.data.data as { assignment: DealerAssignment | null; seats: DealerSeat[] };
}

export async function dealerComplete(): Promise<{ ok: boolean }> {
  const res = await apiClient.post('/dealer/assignment/complete');
  return res.data.data as { ok: boolean };
}

export async function dealerStandUpPlayer(payload: {
  reservationId?: number;
  tableReservationId?: number;
}): Promise<{ ok: boolean; name?: string }> {
  const res = await apiClient.post('/dealer/stand-up-player', payload);
  return res.data.data as { ok: boolean; name?: string };
}
