import { apiClient } from './client';
import {
  ClubCashMethod,
  ClubCashMovement,
  ClubCashMovementPage,
  ClubCashMovementType,
  ClubCashPlayer,
  ClubCashPlayerDetail,
  ClubCashStatus,
  ClubCashSummary,
  ClubCashTournament,
  ClubCashTournamentDetail,
} from './types';

/** Filtros del módulo de recaudación (todos opcionales). */
export interface ClubCashQuery {
  /** Fecha `YYYY-MM-DD` inicial del periodo. */
  from?: string;
  /** Fecha `YYYY-MM-DD` final del periodo. */
  to?: string;
  tournamentId?: number;
  userId?: number;
  type?: ClubCashMovementType;
  status?: ClubCashStatus;
  method?: ClubCashMethod;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ClubCashMovementPayload {
  type: ClubCashMovementType;
  amount: number;
  method?: ClubCashMethod;
  direction?: 'in' | 'out';
  status?: ClubCashStatus;
  tournamentId?: number;
  userId?: number;
  place?: number;
  feeAmount?: number;
  currency?: string;
  note?: string;
  /** Fecha del movimiento (`YYYY-MM-DD`). Por defecto, hoy. */
  occurredAt?: string;
}

export interface ClubCashSettlePayload {
  status: 'paid' | 'pending';
  movementIds?: number[];
  tournamentId?: number;
  userId?: number;
  method?: ClubCashMethod;
  /** Acota la operación al dinero que entra o al que sale (por defecto, ambos). */
  direction?: 'in' | 'out';
}

export interface ClubCashPayout {
  userId: number;
  place: number;
  amount: number;
  method?: ClubCashMethod;
}

export interface ClubCashSyncResult {
  tournaments: number;
  created: number;
  updated: number;
  removed: number;
  total: number;
}

/** Resumen de recaudación del club: dinero que entró, salió y queda por cobrar. */
export async function fetchClubCashSummary(
  clubId: number,
  query: ClubCashQuery = {},
): Promise<ClubCashSummary> {
  const res = await apiClient.get(`/clubs/${clubId}/cash/summary`, {
    params: query,
  });
  return res.data.data as ClubCashSummary;
}

/** Recaudación por torneo (cobrado, pendiente, premios y gastos). */
export async function fetchClubCashTournaments(
  clubId: number,
  query: ClubCashQuery = {},
): Promise<ClubCashTournament[]> {
  const res = await apiClient.get(`/clubs/${clubId}/cash/tournaments`, {
    params: query,
  });
  return res.data.data as ClubCashTournament[];
}

/** Detalle de un torneo: qué jugador pagó, cuánto y qué queda a cobro. */
export async function fetchClubCashTournament(
  clubId: number,
  tournamentId: number,
): Promise<ClubCashTournamentDetail> {
  const res = await apiClient.get(
    `/clubs/${clubId}/cash/tournaments/${tournamentId}`,
  );
  return res.data.data as ClubCashTournamentDetail;
}

/** Ranking de jugadores por dinero invertido en el club. */
export async function fetchClubCashPlayers(
  clubId: number,
  query: ClubCashQuery = {},
): Promise<ClubCashPlayer[]> {
  const res = await apiClient.get(`/clubs/${clubId}/cash/players`, {
    params: query,
  });
  return res.data.data as ClubCashPlayer[];
}

/** Detalle de un jugador: total invertido, desglose por torneo y movimientos. */
export async function fetchClubCashPlayer(
  clubId: number,
  userId: number,
  query: ClubCashQuery = {},
): Promise<ClubCashPlayerDetail> {
  const res = await apiClient.get(`/clubs/${clubId}/cash/players/${userId}`, {
    params: query,
  });
  return res.data.data as ClubCashPlayerDetail;
}

/** Libro de caja paginado, con los totales de todo el filtro. */
export async function fetchClubCashMovements(
  clubId: number,
  query: ClubCashQuery = {},
): Promise<ClubCashMovementPage> {
  const res = await apiClient.get(`/clubs/${clubId}/cash/movements`, {
    params: query,
  });
  return res.data.data as ClubCashMovementPage;
}

/**
 * Sincroniza las reservas del club con el libro de caja: crea, ya **cobradas**, la
 * entrada de cada jugador y una re-entrada por cada rebuy (el cobro se hace al
 * registrar al jugador). Es idempotente (no duplica cobros).
 */
export async function syncClubCash(
  clubId: number,
  payload: {
    tournamentId?: number;
    method?: ClubCashMethod;
  } = {},
): Promise<ClubCashSyncResult> {
  const res = await apiClient.post(`/clubs/${clubId}/cash/sync`, payload);
  return res.data.data as ClubCashSyncResult;
}

/** Cobra (o devuelve a pendiente) movimientos: de un jugador, de un torneo o sueltos. */
export async function settleClubCash(
  clubId: number,
  payload: ClubCashSettlePayload,
): Promise<{ status: ClubCashStatus; updated: number; amount: number }> {
  const res = await apiClient.post(`/clubs/${clubId}/cash/settle`, payload);
  return res.data.data as {
    status: ClubCashStatus;
    updated: number;
    amount: number;
  };
}

/** Registra un movimiento manual (gasto, ingreso, retirada, add-on, premio...). */
export async function createClubCashMovement(
  clubId: number,
  payload: ClubCashMovementPayload,
): Promise<ClubCashMovement> {
  const res = await apiClient.post(`/clubs/${clubId}/cash/movements`, payload);
  return res.data.data as ClubCashMovement;
}

/** Edita un movimiento (estado, forma de pago, nota; el importe es de admin). */
export async function updateClubCashMovement(
  clubId: number,
  movementId: number,
  payload: {
    status?: ClubCashStatus;
    method?: ClubCashMethod;
    note?: string;
    amount?: number;
    feeAmount?: number;
  },
): Promise<ClubCashMovement> {
  const res = await apiClient.patch(
    `/clubs/${clubId}/cash/movements/${movementId}`,
    payload,
  );
  return res.data.data as ClubCashMovement;
}

/** Elimina un movimiento de caja (solo el administrador del club). */
export async function deleteClubCashMovement(
  clubId: number,
  movementId: number,
): Promise<void> {
  await apiClient.delete(`/clubs/${clubId}/cash/movements/${movementId}`);
}

/** Registra los premios pagados de un torneo (uno por puesto, idempotente). */
export async function registerClubCashPayouts(
  clubId: number,
  tournamentId: number,
  payouts: ClubCashPayout[],
): Promise<ClubCashMovement[]> {
  const res = await apiClient.post(
    `/clubs/${clubId}/cash/tournaments/${tournamentId}/payouts`,
    {
      payouts,
    },
  );
  return res.data.data as ClubCashMovement[];
}
