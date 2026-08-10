import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe, updateProfile, UpdateProfilePayload } from '@/api/auth';
import {
  createTableReservation,
  fetchTable,
  fetchTableReservations,
  fetchTables,
} from '@/api/tables';
import {
  createTournamentReservation,
  fetchTournament,
  fetchTournamentReservations,
  fetchTournaments,
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

export function useCreateTableReservation(tableId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => createTableReservation(tableId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['table-reservations', tableId] });
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

export function useTournamentReservations(tournamentId: number) {
  return useQuery({
    queryKey: ['tournament-reservations', tournamentId],
    queryFn: () => fetchTournamentReservations(tournamentId),
    enabled: tournamentId > 0,
  });
}

export function useCreateTournamentReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => createTournamentReservation(tournamentId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournament-reservations', tournamentId] });
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
