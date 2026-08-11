import { Tournament } from '@/api/types';

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

/**
 * Un torneo se puede reservar solo si sigue activo, la inscripción está abierta
 * y el late registration (si existe) todavía no cerró: ya no se puede reservar
 * cuando el torneo llegó a su nivel límite de late registration.
 */
export function canReserveTournament(
  t: Pick<
    Tournament,
    'status' | 'registrationOpen' | 'lateRegistrationEnabled' | 'lateRegistrationUntilLevel' | 'currentLevel'
  >,
): boolean {
  if (t.status === 'completed' || t.status === 'cancelled') return false;
  if (!t.registrationOpen) return false;
  if (
    t.lateRegistrationEnabled &&
    t.lateRegistrationUntilLevel != null &&
    t.currentLevel != null &&
    t.currentLevel >= t.lateRegistrationUntilLevel
  ) {
    return false;
  }
  return true;
}
