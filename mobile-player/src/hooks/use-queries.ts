import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminProfile, fetchMe, updateProfile, UpdateProfilePayload } from '@/api/auth';
import {
  fetchClubs,
  fetchClub,
  fetchClubTables,
  fetchClubTournaments,
  fetchMyClubs,
  fetchMyClubMemberships,
  joinClub,
} from '@/api/clubs';
import {
  dealerAssign,
  dealerComplete,
  dealerStandUpPlayer,
  fetchDealerAssignment,
  fetchDealerContext,
} from '@/api/dealer';
import {
  createTableReservation,
  deleteTableReservation,
  fetchMyTableReservations,
  fetchTable,
  fetchTableReservations,
  fetchTables,
  removeTableReservation,
} from '@/api/tables';
import {
  createTournamentReservation,
  deleteTournamentReservation,
  fetchMyTournamentReservations,
  fetchTournament,
  fetchTournamentChips,
  fetchTournamentPrizes,
  fetchTournamentReservations,
  fetchTournaments,
  rebuyTournamentReservation,
  removeTournamentReservation,
} from '@/api/tournaments';

export function useTables() {
  return useQuery({ queryKey: ['tables'], queryFn: fetchTables });
}

export function useTable(id: number) {
  return useQuery({
    queryKey: ['tables', id],
    queryFn: () => fetchTable(id),
    enabled: id > 0,
    retry: false,
  });
}

export function useTableReservations(tableId: number) {
  return useQuery({
    queryKey: ['table-reservations', tableId],
    queryFn: () => fetchTableReservations(tableId),
    enabled: tableId > 0,
  });
}

export function useMyTableReservations() {
  return useQuery({ queryKey: ['my-table-reservations'], queryFn: fetchMyTableReservations });
}

export function useRemoveTableReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, reservationId }: { tableId: number; reservationId: number }) =>
      removeTableReservation(tableId, reservationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-table-reservations'] });
    },
  });
}

export function useCreateTableReservation(tableId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => createTableReservation(tableId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['table-reservations', tableId] });
      void qc.invalidateQueries({ queryKey: ['my-table-reservations'] });
    },
  });
}

export function useDeleteTableReservation(tableId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: number) => deleteTableReservation(tableId, reservationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['table-reservations', tableId] });
      void qc.invalidateQueries({ queryKey: ['my-table-reservations'] });
    },
  });
}


export function useTournaments() {
  return useQuery({ queryKey: ['tournaments'], queryFn: fetchTournaments });
}

export function useTournament(id: number) {
  return useQuery({
    queryKey: ['tournaments', id],
    queryFn: () => fetchTournament(id),
    enabled: id > 0,
    retry: false,
  });
}

export function useTournamentChips(tournamentId: number) {
  return useQuery({
    queryKey: ['tournament-chips', tournamentId],
    queryFn: () => fetchTournamentChips(tournamentId),
    enabled: tournamentId > 0,
  });
}

export function useTournamentReservations(tournamentId: number) {
  return useQuery({
    queryKey: ['tournament-reservations', tournamentId],
    queryFn: () => fetchTournamentReservations(tournamentId),
    enabled: tournamentId > 0,
  });
}

export function useTournamentPrizes(tournamentId: number) {
  return useQuery({
    queryKey: ['tournament-prizes', tournamentId],
    queryFn: () => fetchTournamentPrizes(tournamentId),
    enabled: tournamentId > 0,
  });
}

export function useMyTournamentReservations() {
  return useQuery({
    queryKey: ['my-tournament-reservations'],
    queryFn: fetchMyTournamentReservations,
  });
}

export function useRemoveTournamentReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tournamentId, reservationId }: { tournamentId: number; reservationId: number }) =>
      removeTournamentReservation(tournamentId, reservationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-tournament-reservations'] });
    },
  });
}

export function useCreateTournamentReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => createTournamentReservation(tournamentId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournament-reservations', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['my-tournament-reservations'] });
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useDeleteTournamentReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: number) => deleteTournamentReservation(tournamentId, reservationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournament-reservations', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['my-tournament-reservations'] });
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

/** Rebuy (re-entrada) de la propia reserva: vuelve a entrar al torneo como jugador activo. */
export function useRebuyTournamentReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: number) => rebuyTournamentReservation(tournamentId, reservationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournament-reservations', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['my-tournament-reservations'] });
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}


export function useClubs() {
  return useQuery({ queryKey: ['clubs'], queryFn: fetchClubs });
}

export function useClub(id: number) {
  return useQuery({
    queryKey: ['clubs', id],
    queryFn: () => fetchClub(id),
    enabled: id > 0,
  });
}

export function useClubTables(clubId: number) {
  return useQuery({
    queryKey: ['clubs', clubId, 'tables'],
    queryFn: () => fetchClubTables(clubId),
    enabled: clubId > 0,
  });
}

export function useClubTournaments(clubId: number) {
  return useQuery({
    queryKey: ['clubs', clubId, 'tournaments'],
    queryFn: () => fetchClubTournaments(clubId),
    enabled: clubId > 0,
  });
}

export function useMyClubs() {
  return useQuery({ queryKey: ['clubs', 'mine'], queryFn: fetchMyClubs });
}

export function useMyClubMemberships() {
  return useQuery({ queryKey: ['clubs', 'memberships'], queryFn: fetchMyClubMemberships });
}

export function useJoinClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => joinClub(code),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clubs', 'mine'] });
      void qc.invalidateQueries({ queryKey: ['clubs', 'memberships'] });
    },
  });
}

// ---------------- Dealer (repartidor) ----------------

export function useDealerContext() {
  return useQuery({ queryKey: ['dealer', 'context'], queryFn: fetchDealerContext });
}

export function useDealerAssignment() {
  return useQuery({ queryKey: ['dealer', 'assignment'], queryFn: fetchDealerAssignment });
}

export function useDealerAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { tournamentId?: number; tableId?: number; tableNumber?: number }) =>
      dealerAssign(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dealer', 'assignment'] });
    },
  });
}

export function useDealerComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => dealerComplete(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dealer', 'assignment'] });
      void qc.invalidateQueries({ queryKey: ['dealer', 'context'] });
    },
  });
}

export function useDealerStandUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { reservationId?: number; tableReservationId?: number }) =>
      dealerStandUpPlayer(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dealer', 'assignment'] });
    },
  });
}

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: fetchMe });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useAdminProfile() {
  return useQuery({
    queryKey: ['admin-profile'],
    queryFn: fetchAdminProfile,
    staleTime: 1000 * 60 * 60, // cache for 1 hour
  });
}
