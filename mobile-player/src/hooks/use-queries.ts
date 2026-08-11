import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminProfile, fetchMe, updateProfile, UpdateProfilePayload } from '@/api/auth';
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
