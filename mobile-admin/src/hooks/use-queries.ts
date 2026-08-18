import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createClub,
  fetchClubMembers,
  fetchClubs,
  fetchUsers,
  removeClubMember,
  updateClub,
  updateClubMember,
  CreateClubPayload,
} from '@/api/clubs';
import {
  createChip,
  deleteChip,
  fetchChips,
  updateChip,
} from '@/api/chips';
import { fetchDashboardStats } from '@/api/dashboard';
import {
  createGameType,
  deleteGameType,
  fetchAllGameTypes,
  fetchGameTypes,
  updateGameType,
} from '@/api/gameTypes';
import {
  createTable,
  deleteTable,
  fetchTable,
  fetchTableReservations,
  fetchTables,
  removeTableReservation,
  updateTable,
} from '@/api/tables';
import {
  addTournamentChip,
  createReservation,
  createTournament,
  deleteTournament,
  eliminateReservation,
  fetchPlayers,
  fetchPrizes,
  fetchReservations,
  fetchTournament,
  fetchTournamentChips,
  fetchTournaments,
  nextTournamentLevel,
  pauseTournament,
  rebuyReservation,
  removeReservation,
  removeTournamentChip,
  resumeTournament,
  standUpReservation,
  startTournament,
  updatePrizes,
  updateReservation,
  updateTournament,
} from '@/api/tournaments';
import {
  ChipPayload,
  GameTypePayload,
  ReservationStatus,
  TablePayload,
  TournamentPayload,
} from '@/api/types';

export function useGameTypes() {
  return useQuery({ queryKey: ['game-types'], queryFn: fetchGameTypes });
}

export function useClubs() {
  return useQuery({ queryKey: ['clubs'], queryFn: fetchClubs });
}

export function useCreateClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClubPayload) => createClub(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clubs'] });
    },
  });
}

export function useUpdateClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateClubPayload> }) =>
      updateClub(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clubs'] });
    },
  });
}

export function useClubMembers(clubId: number) {
  return useQuery({
    queryKey: ['clubs', clubId, 'members'],
    queryFn: () => fetchClubMembers(clubId),
    enabled: clubId > 0,
  });
}

export function useUpdateClubMember(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, status }: { memberId: number; status: 'accepted' | 'rejected' }) =>
      updateClubMember(clubId, memberId, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'members'] });
      void qc.invalidateQueries({ queryKey: ['clubs'] });
    },
  });
}

export function useRemoveClubMember(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) => removeClubMember(clubId, memberId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'members'] });
      void qc.invalidateQueries({ queryKey: ['clubs'] });
    },
  });
}

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: fetchUsers });
}

export function useAllGameTypes() {
  return useQuery({ queryKey: ['game-types', 'all'], queryFn: fetchAllGameTypes });
}

export function useChips() {
  return useQuery({ queryKey: ['chips'], queryFn: fetchChips });
}

export function useTables() {
  return useQuery({ queryKey: ['tables'], queryFn: () => fetchTables() });
}

export function useTable(id?: number) {
  return useQuery({
    queryKey: ['tables', id],
    queryFn: () => fetchTable(id as number),
    enabled: !!id,
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

export function useRemoveTableReservation(tableId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: number) => removeTableReservation(tableId, reservationId),
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

export function useDashboardStats() {
  return useQuery({ queryKey: ['dashboard', 'stats'], queryFn: fetchDashboardStats });
}

// ---- Mutations: chips ----

export function useCreateChip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChipPayload) => createChip(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['chips'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateChip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ChipPayload }) => updateChip(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['chips'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteChip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteChip(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['chips'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ---- Mutations: tables ----

export function useCreateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TablePayload) => createTable(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tables'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TablePayload> }) => updateTable(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tables'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTable(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tables'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ---- Mutations: tournaments ----

export function useCreateTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TournamentPayload) => createTournament(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TournamentPayload> }) => updateTournament(id, payload),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
      void qc.invalidateQueries({ queryKey: ['tournaments', vars.id] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTournament(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ---- Mutations: game types ----

export function useCreateGameType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GameTypePayload) => createGameType(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['game-types'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateGameType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: GameTypePayload }) => updateGameType(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['game-types'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteGameType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteGameType(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['game-types'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ---- Estado en vivo del torneo ----

export function useStartTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => startTournament(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function usePauseTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => pauseTournament(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useResumeTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => resumeTournament(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useNextTournamentLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => nextTournamentLevel(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

// ---- Reservas ----

export function useReservations(tournamentId: number) {
  return useQuery({
    queryKey: ['reservations', tournamentId],
    queryFn: () => fetchReservations(tournamentId),
    enabled: tournamentId > 0,
  });
}

export function useCreateReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => createReservation(tournamentId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reservations', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useUpdateReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      stack,
      tableNumber,
      seatNumber,
    }: {
      id: number;
      status: ReservationStatus;
      stack?: number;
      tableNumber?: number;
      seatNumber?: number;
    }) => updateReservation(tournamentId, id, status, stack, tableNumber, seatNumber),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reservations', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useRemoveReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => removeReservation(tournamentId, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reservations', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useRebuyReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      stack,
      tableNumber,
      seatNumber,
    }: {
      id: number;
      stack?: number;
      tableNumber?: number;
      seatNumber?: number;
    }) => rebuyReservation(tournamentId, id, stack, tableNumber, seatNumber),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reservations', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useStandUpReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: number) => standUpReservation(tournamentId, reservationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reservations', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

/** Eliminar jugador del torneo: deja de contar en "en juego" pero conserva su reserva. */
export function useEliminateReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: number) => eliminateReservation(tournamentId, reservationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reservations', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

// ---- Fichas del torneo ----

export function useTournamentChips(tournamentId: number) {
  return useQuery({
    queryKey: ['tournament-chips', tournamentId],
    queryFn: () => fetchTournamentChips(tournamentId),
    enabled: tournamentId > 0,
  });
}

export function useAddTournamentChip(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chipId, discardLevel }: { chipId: number; discardLevel?: number }) =>
      addTournamentChip(tournamentId, chipId, discardLevel),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournament-chips', tournamentId] });
    },
  });
}

export function useRemoveTournamentChip(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => removeTournamentChip(tournamentId, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournament-chips', tournamentId] });
    },
  });
}

// ---- Premios ----

export function usePrizes(tournamentId: number) {
  return useQuery({
    queryKey: ['prizes', tournamentId],
    queryFn: () => fetchPrizes(tournamentId),
    enabled: tournamentId > 0,
  });
}

export function useUpdatePrizes(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prizes: { place: number; amount: number }[]) => updatePrizes(tournamentId, prizes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prizes', tournamentId] });
    },
  });
}

// ---- Jugadores ----

export function usePlayers() {
  return useQuery({ queryKey: ['players'], queryFn: fetchPlayers });
}