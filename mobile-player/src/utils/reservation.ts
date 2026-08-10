export type ReservationState = 'playing' | 'reserved' | null;

interface TableResLike {
  tableId: number;
  status: string;
}

interface TournamentResLike {
  tournamentId: number;
  status: string;
}

/** Estado de una mesa para el jugador: 'playing' (confirmada) | 'reserved' (pendiente) | null. */
export function tableState(reservations: TableResLike[], tableId: number): ReservationState {
  const found = reservations.find(
    (r) => r.tableId === tableId && (r.status === 'pending' || r.status === 'confirmed'),
  );
  if (!found) return null;
  return found.status === 'confirmed' ? 'playing' : 'reserved';
}

/** Estado de un torneo para el jugador: 'playing' (aceptado) | 'reserved' (pendiente) | null. */
export function tournamentState(reservations: TournamentResLike[], tournamentId: number): ReservationState {
  const found = reservations.find(
    (r) => r.tournamentId === tournamentId && (r.status === 'pending' || r.status === 'accepted'),
  );
  if (!found) return null;
  return found.status === 'accepted' ? 'playing' : 'reserved';
}
